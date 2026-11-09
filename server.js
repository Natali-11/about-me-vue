import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { Bot, InlineKeyboard } from 'grammy';

const app = express();
const db = new DatabaseSync('comments.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    text        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    owner_key   TEXT NOT NULL,
    author_name TEXT NOT NULL,
    parent_id   INTEGER,
    is_admin    INTEGER NOT NULL DEFAULT 0
  )
`);

// ---------- Telegram-бот ----------

const bot = new Bot(process.env.BOT_TOKEN);
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

function isAdmin(ctx) {
  return String(ctx.from.id) === ADMIN_CHAT_ID;
}

// удалить комментарий вместе с ответами на него. используется и сайтом, и ботом
function deleteWithReplies(id) {
  db.prepare('DELETE FROM comments WHERE parent_id = ?').run(id);
}

bot.command('start', (ctx) => {
  ctx.reply('Привет! Твой chat id: ' + ctx.chat.id);
});

bot.on('callback_query:data', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCallbackQuery({ text: 'Нет прав' });
    return;
  }

  const data = ctx.callbackQuery.data;
  if (!data.startsWith('delete:')) return;

  const id = Number(data.split(':')[1]);
  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(id);

  if (result.changes === 0) {
    await ctx.answerCallbackQuery({ text: 'Комментарий уже удалён' });
    await ctx.editMessageText(`Комментарий #${id} уже был удалён`);
    return;
  }

  deleteWithReplies(id); // НОВОЕ

  await ctx.answerCallbackQuery({ text: 'Удалено' });
  await ctx.editMessageText(`Комментарий #${id} удалён`);
});

bot.catch((err) => console.error('Ошибка бота:', err.message));
bot.start();

function notifyAdmin(comment) {
  const keyboard = new InlineKeyboard().text('Удалить', 'delete:' + comment.id);

  // НОВОЕ: разный текст для комментария и для ответа
  const msg = comment.parent_id === null
    ? `Новый комментарий #${comment.id} от ${comment.author_name}:\n${comment.text}`
    : `Ответ #${comment.id} от ${comment.author_name} на комментарий #${comment.parent_id}:\n${comment.text}`;

  bot.api
    .sendMessage(ADMIN_CHAT_ID, msg, { reply_markup: keyboard })
    .catch((err) => console.error('Не удалось отправить в Telegram:', err.message));
}

// Сайт (API)

app.use(express.json());

app.get('/api/comments', (req, res) => {
  const comments = db
    .prepare('SELECT id, text, created_at, author_name, parent_id, is_admin FROM comments ORDER BY id') // НОВОЕ
    .all();
  res.json(comments);
});

app.post('/api/comments', (req, res) => {
  // 1. Текст
  const text = req.body?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    res.status(400).json({ error: 'Комментарий не может быть пустым' });
    return;
  }

  // имя
  const name = req.body?.name;
  const authorName = typeof name === 'string' && name.trim() !== ''
    ? name.trim().slice(0, 40)
    : 'Аноним';

  // ответ на комментарий
  const parentId = req.body?.parent_id ?? null;
  if (parentId !== null) {
    if (!Number.isInteger(parentId)) {
      res.status(400).json({ error: 'Неверный номер комментария' });
      return;
    }
    const parent = db.prepare('SELECT id, parent_id FROM comments WHERE id = ?').get(parentId);
    if (!parent) {
      res.status(400).json({ error: 'Комментарий для ответа не найден' });
      return;
    }
    if (parent.parent_id !== null) {
      res.status(400).json({ error: 'Нельзя отвечать на ответ' });
      return;
    }
  }

  // Сохранение (is_admin не указываем и в базе будет 0)
  const createdAt = new Date().toISOString();
  const key = crypto.randomUUID();
  const result = db
    .prepare(`
      INSERT INTO comments (text, created_at, owner_key, author_name, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(text, createdAt, key, authorName, parentId);

  // Ответ
  const newComment = {
    id: Number(result.lastInsertRowid),
    text: text,
    created_at: createdAt,
    author_name: authorName,
    parent_id: parentId,
    is_admin: 0,
    key: key,
  };

  notifyAdmin(newComment);
  res.status(201).json(newComment);
});

app.delete('/api/comments/:id', (req, res) => {
  const commentId = Number(req.params.id);
  const key = req.body?.key;

  const result = db.prepare('DELETE FROM comments WHERE id = ? AND owner_key = ?').run(commentId, key);
  if (result.changes === 0) {
    res.status(403).json({ error: 'Нет прав на удаление этого комментария' });
    return;
  }

  deleteWithReplies(commentId); 
  res.status(204).end();
});

app.listen(3000, () => {
  console.log('Сервер работает: http://localhost:3000');
});