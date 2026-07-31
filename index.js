const { error } = require('console');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const Sentry = require('@sentry/node');
const fs = require('fs/promises');
const path = require('path');
const jwt = require('jsonwebtoken');

const DB = path.join(__dirname, 'db.json');
const app = express();
const {
  taskId,
  validateCreateTask,
  validateReplaceTask,
  validatePatchTask,
  validateGetTasks,
  handleValidationErrors,
} = require('./validators');
const { body } = require('express-validator');
const { randomUUID } = require('crypto');

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

//чтение БД (файла db.json)
async function readBD() {
  try {
    // Проверяем, существует ли файл
    await fs.access(DB);
    // Если существует - читаем
    const data = await fs.readFile(DB, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Если файл не существует (ENOENT) или любая другая ошибка чтения
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      const initialData = { users: [], tasks: [] };
      // Создаем директорию, если её нет
      await fs.mkdir(path.dirname(DB), { recursive: true });
      await fs.writeFile(DB, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    throw error;
  }
}

//запись в бд (файла db.json)
async function writeBD(data) {
  await fs.writeFile(DB, JSON.stringify(data, null, 2));
}

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const db = await readBD();

  const user = {
    id: randomUUID(),
    email,
    passwordHash: await bcrypt.hash(password, 10),
  };

  db.users.push(user);
  await writeBD(db);

  res.status(201).json({ id: user.id, email: user.email });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await readBD();
  const user = db.users.find((i) => i.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const pass = await bcrypt.compare(password, user.passwordHash);
  if (!pass) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  res.json({ token: signToken(user) });
});
//ФОРМИРУЕМ ТОКЕН!!!!! И ВЫЗЫВАЕМ ВЫШЕ
// ФОРМИРУЕМ ТОКЕН!!!!! И ВЫЗЫВАЕМ ВЫШЕ
function signToken(user) {
  // Если в .env строка '1h' - оставляем как есть. Если '3600' - превращаем в число
  let ttl = process.env.TOKEN_TTL;
  if (typeof ttl === 'string' && /^\d+$/.test(ttl)) {
    ttl = parseInt(ttl, 10);
  }

  return jwt.sign({ id: user.id, email: user.email }, process.env.SECRET, {
    expiresIn: ttl, // Теперь это значение безопасно для библиотеки
  });
}

function auth(req, res, next) {
  // 1. Проверяем, есть ли вообще заголовок, чтобы не упасть
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  // 2. Теперь безопасно делаем split, так как мы знаем, что authHeader существует
  const [scheme, token] = authHeader.split(' ');

  // 3. Проверяем формат
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Неверный формат токена' });
  }

  try {
    req.user = jwt.verify(token, process.env.SECRET, { algorithms: ['HS256'] });
    next();
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    res
      .status(401)
      .json({ error: expired ? 'Токен истёк' : 'Токен невалиден' });
  }
}
// GET получить все таски
app.get(
  '/tasks',
  auth,
  validateGetTasks,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      let db = await readBD();

      // Фильтруем задачи именно этого пользователя
      let userTask = db.tasks.filter((item) => item.userId === req.user.id);

      // Фильтрация по completed (выполненные задачи)
      // if (req.query.completed !== undefined) {
      //   const isCompleted = req.query.completed === 'true';
      //   userTask = userTask.filter((item) => item.completed === isCompleted);
      // }

      res.json({
        count: userTask.length,
        tasks: userTask,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get получаю таски по id
app.get(
  '/tasks/:id',
  auth,
  taskId(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const db = await readBD();
      const { id } = req.params;
      const task = db.tasks.find((item) => item.id == id);
      if (!task) {
        return res.status(404).json({ error: 'задача не найдена' });
      }

      //Проверяю, что принадлежит именно этому поль-лю
      if (task.userId !== req.user.id) {
        return res.status(403).json({ error: 'Нет доступа к этой задаче' });
      }
      res.json(task);
    } catch (error) {
      next(error);
    }
  },
);

//POST- создание новой таски
app.post(
  '/tasks',
  auth,
  validateCreateTask,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title } = req.body;
      const db = await readBD();

      db.tasks.push({
        userId: req.user.id,
        id: randomUUID(),
        title,
        completed: false,
      });
      await writeBD(db);
      res.status(201).json({
        message: 'Задача создана успешно',
        task: db[db.length - 1],
      });
    } catch (error) {
      next(error);
    }
  },
);

//PUT-Обновить задачу  title по id

app.put(
  '/tasks/:id',
  auth,
  validateReplaceTask,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title } = req.body;

      const db = await readBD();
      const taskIndex = db.tasks.findIndex((item) => item.id == id);
      if (taskIndex == -1) {
        return res.status(404).json({ error: `задача с id ${id} не найдена` });
      }
      //проверяю, что задача именно этого польз-ля
      if (db.tasks[taskIndex].userId !== req.user.id) {
        return res.status(403).json({ error: 'Нет доступа к этой задаче' });
      }
      db.tasks[taskIndex].title = title.trim();
      await writeBD(db);
      res.json({
        message: 'Задача обновлена успешно',
        task: db.tasks[taskIndex],
      });
    } catch (error) {
      next(error);
    }
  },
);

//PATCH - изменение статуса
app.patch(
  '/tasks/:id',
  auth,
  validatePatchTask,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { completed } = req.body;
      const db = await readBD();
      const taskIndex = db.tasks.findIndex((task) => task.id == id);

      if (taskIndex === -1) {
        return res.status(404).json({ error: `Задача с id ${id} не найдена` });
      }
      //проверяю, что принадлежит именно этому пользователю
      if (db.tasks[taskIndex].userId !== req.user.id) {
        return res.status(403).json({ error: 'Нет доступа к этой задаче' });
      }

      db.tasks[taskIndex].completed = !!completed;
      await writeBD(db);
      res.json(db.tasks[taskIndex]);
    } catch (error) {
      console.error('Ошибка PATCH', error);
      res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
  },
);

//DELETE - удаление по id
app.delete(
  '/tasks/:id',
  auth,
  taskId(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = await readBD();
      const taskIndex = db.tasks.findIndex((item) => item.id == id);
      if (taskIndex == -1) {
        return res.status(404).json(`задача с id ${id} не найдена`);
      }

      //проверяю, что принадлежит именно этому пользователю
      if (db.tasks[taskIndex].userId !== req.user.id) {
        return res.status(403).json({ error: 'Нет доступа к этой задаче' });
      }
      const deleteTask = db.tasks.splice(taskIndex, 1);
      await writeBD(db);
      res.json({
        message: 'Задача удалена',
        deleted: deleteTask,
      });
    } catch (error) {
      console.error('ошибка DELETE', error);
      res.status(500).json({ error: 'Ошибка при удалении' });
    }
  },
);

app.use((error, req, res, next) => {
  console.error('Ошибка:', error);
  res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
});
app.listen(process.env.PORT, () => {
  console.log('Стартуем!');
});
