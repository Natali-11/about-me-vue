import express from 'express';
import { DatabaseSync } from 'node:sqlite';

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