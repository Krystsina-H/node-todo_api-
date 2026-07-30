const express = require('express');
require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { json } = require('stream/consumers');

const app = express();

const DB = path.join(__dirname, 'db.json');
console.log('Мой путь ', __dirname);

app.use(express.json());

//Создание файла
app.get('/create', async (req, res) => {
  try {
    await fs.writeFile(DB, JSON.stringify([], null, 2), { flag: 'wx' });
    res.send('СОЗДАЛ!');
  } catch (error) {}
});

app.get('/reade', (req, res) => {
  console.log('GET2');
});

//добавление таски
app.post('/write', async (req, res) => {
  try {
    const { title } = req.body;
    const row = await fs.readFile(DB, 'utf-8');
    const tasks = JSON.parse(row);
    tasks.push({
      id: crypto.randomUUID(),
      title,
      done: false,
      createdAt: new Date(),
    });
    await fs.writeFile(DB, JSON.stringify(tasks, null, 2));
    res.send('Таска добавлена');
  } catch (error) {}
});

app.delete('/deleteFile', async (req, res) => {
  try {
    await fs.unlink(DB);
    res.send('Файл удалён');
  } catch (error) {}
});

// const tasks = [
//   { id: 1, title: 'Выучить HTTP-методы', done: true },
//   { id: 2, title: 'Разобраться с заголовками', done: false },
//   { id: 3, title: 'Понять разницу PUT и PATCH', done: false },
// ];

// app.get('/todos', (req, res) => {
//   console.log('Метод get');
//   res.json(tasks);
// });

// app.post('/todos', (req, res) => {
//   console.log('Отработал POST');

//   const { title } = req.body;
//   const newTask = {
//     id: crypto.randomUUID(),
//     title: title,
//     done: false,
//   };
//   tasks.push(newTask);

//   res.status(201).json(newTask);
// });

// app.put('/todos/:id', (req, res) => {
//   console.log('put отработал');

//   const { id } = req.params;
//   const { title } = req.body;

//   const task = tasks.find((item) => item.id == id);
//   task.title = title;
//   res.status(201).json(task);
// });

// app.delete('/todos/:id', (req, res) => {
//   const { id } = req.params;
//   const index = tasks.findIndex((item) => item.id == id);
//   tasks.splice(index, 1);
//   res.json(id);
// });

// app.patch('/todos/:id', (req, res) => {
//   const { id } = req.params;
//   const task = tasks.find((item) => item.id == id);
//   task.done = !task.done;
//   res.status(201).json(id);
// });

app.listen(process.env.PORT, () => {
  console.log('Стартуем!');
});
