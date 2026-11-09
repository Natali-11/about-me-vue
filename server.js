import express from 'express';
import { DatabaseSync } from 'node:sqlite';

const app = express();          // создаём сервер
const db = new DatabaseSync('comments.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);
app.use(express.json()); // если придет JSON, разобрать его

app.get('/api/comments', (req, res) => {
  const comments = db.prepare('SELECT id, text, created_at FROM comments ORDER BY id').all();
  res.json(comments);
});

app.post('/api/comments', (req, res) => {
    const text = req.body.text;
    if (req.body.text.trim() === '') {res.status(400).json({error: 'Комментарий не может быть пустым'}); return;}   
    const createdAt = new Date().toISOString();                     
    const result = db.prepare('INSERT INTO comments (text, created_at) VALUES (?, ?)').run(text, createdAt);
    const newComment = {id: Number(result.lastInsertRowid), text: text, created_at:createdAt };
    res.status(201).json(newComment);     
});

app.delete('/api/comments/:id', (req, res) => {
    const commentId = Number(req.params.id);
    const result = db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
    if(result.changes === 0){res.status(404).json({error: 'Комментарий не найден'}); return;};
    res.status(204).end();
});

app.listen(3000, () => {        // слушать порт 3000
  console.log('Сервер работает: http://localhost:3000');
});