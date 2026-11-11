//используется express - библиотека для создания веб-сервера на Node.js
import express from 'express';
import { DatabaseSync } from 'node:sqlite'; //база данных  DatabaseSync - встроенная в Node.js база данных "SQLite"
import { Bot, InlineKeyboard } from 'grammy'; //Bot, InlineKeyboard - из библиотеки "grammY" для Telegram-ботов

const app = express(); //создаём веб-сервер

//База данных:
//SQLite хранит всю базу в одном файле, если файла нет - он создаётся.
const db = new DatabaseSync('comments.db');

//Таблица создаётся при первом запуске
//  id - номер комментария, база выдаёт его сама по порядку 
//  created_at - дата создания в часовом поясе UTC
//  parent_id - номер комментария, на который это ответ (NULL у обычных комментариев)
//  owner_key - секретный ключ автора комментария, нужен для удаления с сайта
//  is_admin - 1, если ответ написан автором сайта через Telegram
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

//Удалить все ответы на комментарий, если удалили основной комментарий
//prepare - подготовить SQL-запрос, run - выполнить его, подставив значение вместо ?
function deleteWithReplies(id) {
  db.prepare('DELETE FROM comments WHERE parent_id = ?').run(id);
}

//Telegram-бот

//Токен бота и айди чата сохранены в секретном файле
//process.env - переменные окружения
const bot = new Bot(process.env.BOT_TOKEN);
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const ADMIN_NAME = 'Наталья Помольцева :)';

//На какой комментарий бот сейчас ждёт ответ: { targetId, mention } или null
//хранится в памяти сервера - при перезапуске обнуляется
let pendingReply = null;

//управлять комментариями может только автор сайта.
//ctx (context) - всё о пришедшем сообщении: кто написал, в каком чате, что именно.
//String(...) - из .env всё приходит строками, а id в Telegram - число.
function isAdmin(ctx) {
  return String(ctx.from.id) === ADMIN_CHAT_ID;
}

//Команды объявляются раньше обработчика message:text,
//иначе обработчик grammY "перехватит" их как обычный текст, введенный в бота

//"/start" - бот присылает номер чата нужен был один раз при создании, чтобы записать его в .env (для доступа только автору)
bot.command('start', (ctx) => {
  ctx.reply('Chat id: ' + ctx.chat.id); //reply — ответить в тот же чат
});

///cancel - передумать отвечать на комментарий
bot.command('cancel', (ctx) => {
  if (!isAdmin(ctx)) return;
  pendingReply = null;
  ctx.reply('Ответ отменён');
});

// "/post текст" чтобы опубликовать основной комментарий от имени автора из бота
bot.command('post', async (ctx) => {
  if (!isAdmin(ctx)) return; //если пытается отправить не реальный автор
  // ctx.match - всё, что написано после команды: "/post Привет!" становится "Привет!""
  const text = ctx.match.trim();
  if (text === '') {
    await ctx.reply('Напишите текст после команды, например: /post Всем привет!');
    return;
  }

  // parent_id не указываем - NULL, то есть это основной комментарий, а не ответ
  db.prepare(`
    INSERT INTO comments (text, created_at, owner_key, author_name, is_admin)
    VALUES (?, ?, ?, ?, 1)
  `).run(text, new Date().toISOString(), crypto.randomUUID(), ADMIN_NAME);

  await ctx.reply('Комментарий опубликован на сайте');
});

//Нажатие на кнопку под уведомлением
//В кнопке хранится строка вида 'delete:5' или 'reply:5'.
bot.on('callback_query:data', async (ctx) => {
  if (!isAdmin(ctx)) { //если в бот зашел не автор
    //answerCallbackQuery - подтвердить нажатие, text - всплывающее уведомление
    await ctx.answerCallbackQuery({ text: 'Нет прав' });
    return;
  }

  // из 'delete:5'.split(':') в ['delete', '5'], то есть раскложить по двум переменным
  const [action, idText] = ctx.callbackQuery.data.split(':');
  const id = Number(idText);

  if (action === 'delete') {
    //Автор сайта удаляет любой комментарий, поэтому без проверки owner_key
    const result = db.prepare('DELETE FROM comments WHERE id = ?').run(id);

    //changes - сколько строк удалилось; 0 - такого комментария уже нет
    if (result.changes === 0) {
      await ctx.answerCallbackQuery({ text: 'Комментарий уже удалён' });
      await ctx.editMessageText(`Комментарий #${id} уже был удалён`); //заменить текст уведомления
      return;
    }

    deleteWithReplies(id);
    await ctx.answerCallbackQuery({ text: 'Удалено' });
    await ctx.editMessageText(`Комментарий #${id} удалён`);
    return;
  }

  if (action === 'reply') {
    //get - вернуть одну строку из базы (или undefined, если не нашлась)
    const comment = db.prepare('SELECT id, parent_id, author_name FROM comments WHERE id = ?').get(id);
    if (!comment) {
      await ctx.answerCallbackQuery({ text: 'Комментарий уже удалён' });
      return;
    }

    //Ответ всегда идёт в ветку основного комментария
    //если отвечаем на ответ - в начало текста подставляется имя его автора
    //?? "если слева null, взять справа" 
    pendingReply = {
      targetId: comment.parent_id ?? comment.id,
      mention: comment.parent_id !== null ? comment.author_name + ', ' : '',
    };

    await ctx.answerCallbackQuery();
    await ctx.reply(`Напишите ответ для ${comment.author_name} (для отмены - /cancel)`);
  }
});

//Текстовое сообщение от автора - это ответ на комментарий, если перед этим была нажата «Ответить»
bot.on('message:text', async (ctx) => {
  if (!isAdmin(ctx)) return;   //сообщения от чужих людей бот игнорирует

  if (pendingReply === null) {
    await ctx.reply('Чтобы ответить, нажмите «↩ Ответить» под комментарием');
    return;
  }

  //проверка на то, что пока автор писал ответ, комментарий могли удалить
  const parent = db.prepare('SELECT id FROM comments WHERE id = ?').get(pendingReply.targetId);
  if (!parent) {
    pendingReply = null;
    await ctx.reply('Этот комментарий уже удалён, ответ не опубликован');
    return;
  }

  const text = pendingReply.mention + ctx.message.text;   //"Имя, " + "спасибо!"

  //Ключ генерируется, но никому не отдаётся - удалить такой ответ можно только через бота.
  db.prepare(`
    INSERT INTO comments (text, created_at, owner_key, author_name, parent_id, is_admin)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(text, new Date().toISOString(), crypto.randomUUID(), ADMIN_NAME, pendingReply.targetId);

  pendingReply = null;
  await ctx.reply('Ответ опубликован на сайте');
});

//Ловим ошибки обработчика
bot.catch((err) => console.error('Ошибка бота:', err.message));

//Бот сам опрашивает Telegram, так как работает пока без публичного адреса (локально)
bot.start();

//Уведомление автору о новом комментарии - с кнопками "Ответить" и "Удалить"
function notifyAdmin(comment) {
  //InlineKeyboard - кнопки под сообщением. text(надпись, скрытые данные кнопки)
  const keyboard = new InlineKeyboard()
    .text('↩Ответить', 'reply:' + comment.id)
    .text('Удалить', 'delete:' + comment.id);

  //Шаблонная строка в `обратных кавычках`: ${...} вставляет значение, \n — перенос строки
  const msg = comment.parent_id === null
    ? `Новый комментарий #${comment.id} от ${comment.author_name}:\n${comment.text}`
    : `↪Ответ #${comment.id} от ${comment.author_name} на комментарий #${comment.parent_id}:\n${comment.text}`;

  //.catch обработчик ошибок
  bot.api
    .sendMessage(ADMIN_CHAT_ID, msg, { reply_markup: keyboard })
    .catch((err) => console.error('Не удалось отправить в Telegram:', err.message));
}

//АPI для сайта
//req (request) - входящий запрос от страницы, res (response) - ответ сервера

//Разбирает JSON из тела запроса и кладёт его в req.body
app.use(express.json());

//GET /api/comments — получить все комментарии.
//owner_key НЕ отдаём - иначе любой мог бы взять чужой ключ и удалить чужой комментарий
app.get('/api/comments', (req, res) => {
  const comments = db
    .prepare('SELECT id, text, created_at, author_name, parent_id, is_admin FROM comments ORDER BY id')
    .all(); //all — вернуть все найденные строки массивом объектов
  res.json(comments);  //отправить массив в формате JSON (код ответа 200 по умолчанию)
});

//POST /api/comments — добавить комментарий или ответ.
//Сервер проверяет всё сам - запрос можно отправить в обход страницы (например, из консоли в панели для разработчика)
app.post('/api/comments', (req, res) => {
  //?. - если req.body нет, не падать с ошибкой, а получить undefined
  const text = req.body?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    res.status(400).json({ error: 'Комментарий не может быть пустым' }); //400 — неверный запрос
    return; //return на один запрос только один ответ
  }

  //Имя - обрезаем пробелы и длину до 40 символов, если не указано "Аноним"
  const name = req.body?.name;
  const authorName = typeof name === 'string' && name.trim() !== ''
    ? name.trim().slice(0, 40)
    : 'Аноним';

  //Если это ответ - комментарий должен существовать и сам не быть ответом
  const parentId = req.body?.parent_id ?? null;
  if (parentId !== null) {
    if (!Number.isInteger(parentId)) {  //проверка, что прислали целое число
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

  //Время храним в UTC, в часовой пояс посетителя переводит страница
  const createdAt = new Date().toISOString();
  const key = crypto.randomUUID();  //случайная строка из 36 символов

  //Знаки ? защищают от SQL-инъекций, значения подставляются как данные, а не как часть команды.
  //is_admin не указываем - для комментариев с сайта он всегда 0.
  const result = db
    .prepare(`
      INSERT INTO comments (text, created_at, owner_key, author_name, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(text, createdAt, key, authorName, parentId); //значения подставляются вместо ? по порядку

  const newComment = {
    id: Number(result.lastInsertRowid), //номер, который база выдала новой строке
    text: text,
    created_at: createdAt,
    author_name: authorName,
    parent_id: parentId,
    is_admin: 0,
    key: key, //ключ получает только автор комментария - в ответ на свой POST
  };

  notifyAdmin(newComment);
  res.status(201).json(newComment); //201 - создано
});

//DELETE /api/comments/:id - удалить свой комментарий.
//:id - изменяемая часть адреса, попадает в req.params.id.
//Удаляется, только если совпали и id, и секретный ключ
app.delete('/api/comments/:id', (req, res) => {
  const commentId = Number(req.params.id);   //из адреса id приходит строкой
  const key = req.body?.key;

  const result = db.prepare('DELETE FROM comments WHERE id = ? AND owner_key = ?').run(commentId, key);
  if (result.changes === 0) {
    res.status(403).json({ error: 'Нет прав на удаление этого комментария' }); //403 - доступ запрещён
    return;
  }

  deleteWithReplies(commentId);
  res.status(204).end(); //204 - успешно, ответ без тела
});

//Запустить сервер на порту 3000
app.listen(3000, () => {
  console.log('Сервер работает: http://localhost:3000');
});