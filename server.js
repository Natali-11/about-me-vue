import express from 'express';
import fs from 'node:fs';

const app = express();          // создаём сервер
app.use(express.json()); // если придет JSON, разобрать его

app.get('/api/comments', (req, res) => {
    const text = fs.readFileSync('comments.json', 'utf-8'); 
    const comments = JSON.parse(text);
  res.json(comments);     
});

app.post('/api/comments', (req, res) => {
    if (req.body.text.trim() === '') {res.status(400).json({error: 'Комментарий не может быть пустым'}); return;}
    const text = fs.readFileSync('comments.json', 'utf-8'); 
    const comments = JSON.parse(text);
    const newComment = {id: Date.now(), text: req.body.text};
    comments.push(newComment);
    fs.writeFileSync('comments.json', JSON.stringify(comments, null, 2));
  res.status(201).json(newComment);     
});

app.delete('/api/comments/:id', (req, res) => {
    const commentId = Number(req.params.id);
    const text = fs.readFileSync('comments.json', 'utf-8'); 
    const comments = JSON.parse(text);
    const updated = comments.filter((comment) => comment.id !== commentId);
    if(updated.length === comments.length){res.status(404).json({error: 'Комментарий не найден'}); return;}
    fs.writeFileSync('comments.json', JSON.stringify(updated, null, 2));
    res.status(204).end();
});

app.listen(3000, () => {        // слушать порт 3000
  console.log('Сервер работает: http://localhost:3000');
});