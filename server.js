import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { Bot, InlineKeyboard } from 'grammy';

const app = express();
const db = new DatabaseSync('comments.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    owner_key  TEXT NOT NULL
  )
`);

// тг-бот
const bot = new Bot(process.env.BOT_TOKEN);
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// Проверка: это написал или нажал автор сайта?
function isAdmin(ctx) {
  return String(ctx.from.id) === ADMIN_CHAT_ID;
}

bot.command('start', (ctx) => {
  ctx.reply('Привет! Твой chat id: ' + ctx.chat.id);
});

// Нажатие на кнопку под сообщением
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

  await ctx.answerCallbackQuery({ text: 'Удалено' });
  await ctx.editMessageText(`Комментарий #${id} удалён`);
});

bot.catch((err) => console.error('Ошибка бота:', err.message));
bot.start();

// Отправить автору уведомление о новом комментарии
function notifyAdmin(comment) {
  const keyboard = new InlineKeyboard().text('Удалить', 'delete:' + comment.id);
  const msg = `Новый комментарий #${comment.id}:\n${comment.text}`;

  bot.api
    .sendMessage(ADMIN_CHAT_ID, msg, { reply_markup: keyboard })
    .catch((err) => console.error('Не удалось отправить в Telegram:', err.message));
}

// сайт (API)

app.use(express.json());

app.get('/api/comments', (req, res) => {
  const comments = db.prepare('SELECT id, text, created_at FROM comments ORDER BY id').all();
  res.json(comments);
});

app.post('/api/comments', (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    res.status(400).json({ error: 'Комментарий не может быть пустым' });
    return;
  }

  const createdAt = new Date().toISOString();
  const key = crypto.randomUUID();
  const result = db
    .prepare('INSERT INTO comments (text, created_at, owner_key) VALUES (?, ?, ?)')
    .run(text, createdAt, key);

  const newComment = { id: Number(result.lastInsertRowid), text: text, created_at: createdAt, key: key };

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
  res.status(204).end();
});

app.listen(3000, () => {
  console.log('Сервер работает: http://localhost:3000');
});