const dns = require('dns');
const resolver = new dns.promises.Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);
dns.promises.resolve = resolver.resolve.bind(resolver);
dns.promises.resolve4 = resolver.resolve4.bind(resolver);
dns.promises.resolve6 = resolver.resolve6.bind(resolver);
dns.promises.resolveSrv = resolver.resolveSrv.bind(resolver);
dns.promises.resolveTxt = resolver.resolveTxt.bind(resolver);
dns.promises.resolveCname = resolver.resolveCname.bind(resolver);
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const {
  taskId,
  validateLogin,
  validateCreateTask,
  validateReplaceTask,
  validatePatchTask,
  validateGetTasks,
  handleValidationErrors,
} = require('./validators');
const { body } = require('express-validator');

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

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME;

let db;

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('MongoDB подключена');
}

//регистрация с манго
app.post('/api/auth/register', async (req, res) => {
  const users = db.collection('users');
  const { name, email, password } = req.body;
  const existingUser = await users.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'Пользователь уже существует' });
  }
  const user = {
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
  };
  const result = await users.insertOne(user);
  const token = signToken({ _id: result.insertedId, name, email });
  res.status(201).json({ access_token: token, user: { id: result.insertedId.toString(), name, email } });
});

//аутентификация
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
    const decoded = jwt.verify(token, process.env.SECRET, { algorithms: ['HS256'] });
    req.user = { id: decoded.id?.toString() || decoded._id?.toString(), email: decoded.email };
    next();
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    res
      .status(401)
      .json({ error: expired ? 'Токен истёк' : 'Токен невалиден' });
  }
}
//логин
app.post('/api/auth/login', async (req, res) => {
  const users = db.collection('users');
  const { email, password } = req.body;
  const user = await users.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const pass = await bcrypt.compare(password, user.passwordHash);
  if (!pass) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  res.json({ access_token: signToken(user), user: { id: user._id.toString(), name: user.name, email: user.email } });
});

//формируем токен
function signToken(user) {
  // Если в .env строка '1h' - оставляем как есть. Если '3600' - превращаем в число
  let ttl = process.env.TOKEN_TTL;
  if (typeof ttl === 'string' && /^\d+$/.test(ttl)) {
    ttl = parseInt(ttl, 10);
  }

  return jwt.sign({ id: user._id, email: user.email }, process.env.SECRET, {
    expiresIn: ttl, // Теперь это значение безопасно для библиотеки
  });
}

// получить все таски
app.get(
  '/api/todos',
  auth,
  validateGetTasks,
  handleValidationErrors,
  async (req, res, next) => {
    const tasks = db.collection('tasks');
    try {
      const filter = { userId: req.user.id };
      if (req.query.completed !== undefined) {
        filter.completed = req.query.completed === 'true';
      }
      const userTasks = await tasks.find(filter).toArray();
      const formattedTasks = userTasks.map(task => ({
        id: task._id.toString(),
        userId: task.userId,
        title: task.title,
        description: task.description,
        completed: task.completed,
      }));
      res.json({
        data: formattedTasks,
      });
    } catch (error) {
      next(error);
    }
  },
);

//получить таски по id
app.get(
  '/api/todos/:id',
  auth,
  taskId(),
  handleValidationErrors,
  async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'задача не найдена' });
    }
    const tasks = db.collection('tasks');
    try {
      const { id } = req.params;
      const task = await tasks.findOne({ _id: new ObjectId(id) });
      if (!task) {
        return res.status(404).json({ error: 'задача не найдена' });
      }
      if (task.userId?.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Нет доступа к этой задаче' });
      }
      res.json({
        id: task._id.toString(),
        userId: task.userId,
        title: task.title,
        description: task.description,
        completed: task.completed,
      });
    } catch (error) {
      next(error);
    }
  },
);

//POST- создание новой таски
app.post(
  '/api/todos',
  auth,
  validateCreateTask,
  handleValidationErrors,
  async (req, res, next) => {
    const tasks = db.collection('tasks');
    try {
      const { title, description } = req.body;
      const newTask = {
        userId: req.user.id,
        title: title.trim(),
        description: description || '',
        completed: false,
      };
      const result = await tasks.insertOne(newTask);
      res.status(201).json({
        id: result.insertedId.toString(),
        userId: newTask.userId,
        title: newTask.title,
        description: newTask.description,
        completed: newTask.completed,
      });
    } catch (error) {
      next(error);
    }
  },
);

//PUT-Обновить задачу  title по id
app.put(
  '/api/todos/:id',
  auth,
  validateReplaceTask,
  handleValidationErrors,
  async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'задача не найдена' });
    }
    const tasks = db.collection('tasks');
    try {
      const { title } = req.body;
      const objectId = new ObjectId(req.params.id);
      const task = await tasks.findOne({ _id: objectId });
      if (!task) {
        return res
          .status(404)
          .json({ error: `задача с id ${req.params.id} не найдена` });
      }

      if (task.userId?.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Нет доступа к этой задаче' });
      }
      await tasks.updateOne(
        { _id: objectId },
        { $set: { title: title.trim() } },
      );

      const updated = await tasks.findOne({ _id: objectId });
      res.json({
        id: updated._id.toString(),
        userId: updated.userId,
        title: updated.title,
        description: updated.description,
        completed: updated.completed,
      });
    } catch (error) {
      next(error);
    }
  },
);
// переключить статус задачи (toggle)
app.patch(
  '/api/todos/:id/toggle',
  auth,
  async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }
    const tasks = db.collection('tasks');

    try {
      const objectId = new ObjectId(req.params.id);
      const task = await tasks.findOne({ _id: objectId });
      if (!task) {
        return res.status(404).json({ error: 'Задача не найдена' });
      }
      if (task.userId?.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Нет доступа к этой задаче' });
      }
      await tasks.updateOne(
        { _id: objectId },
        { $set: { completed: !task.completed } },
      );
      const updated = await tasks.findOne({ _id: objectId });
      res.json({
        id: updated._id.toString(),
        userId: updated.userId,
        title: updated.title,
        description: updated.description,
        completed: updated.completed,
      });
    } catch (error) {
      console.error('Ошибка toggle', error);
      res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
  },
);
// изменить статус задачи
app.patch(
  '/api/todos/:id',
  auth,
  validatePatchTask,
  handleValidationErrors,
  async (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'задача не найдена' });
    }
    const tasks = db.collection('tasks');

    try {
      const { completed } = req.body;
      const objectId = new ObjectId(req.params.id);

      const task = await tasks.findOne({ _id: objectId });
      if (!task) {
        return res
          .status(404)
          .json({ error: `Задача с id ${req.params.id} не найдена` });
      }

      if (task.userId?.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Нет доступа к этой задаче' });
      }

      await tasks.updateOne(
        { _id: objectId },
        { $set: { completed: !!completed } },
      );

      const updated = await tasks.findOne({ _id: objectId });
      res.json({
        id: updated._id.toString(),
        userId: updated.userId,
        title: updated.title,
        description: updated.description,
        completed: updated.completed,
      });
    } catch (error) {
      console.error('Ошибка PATCH', error);
      res.status(500).json({ error: 'Ошибка обновления статуса' });
    }
  },
);

//удалить задачу ===
app.delete(
  '/api/todos/:id',
  auth,
  taskId(),
  handleValidationErrors,
  async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'задача не найдена' });
    }
    const tasks = db.collection('tasks');

    try {
      const objectId = new ObjectId(req.params.id);

      const task = await tasks.findOne({ _id: objectId });
      if (!task) {
        return res
          .status(404)
          .json({ error: `задача с id ${req.params.id} не найдена` });
      }

      if (task.userId?.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Нет доступа к этой задаче' });
      }

      await tasks.deleteOne({ _id: objectId });

      res.json({
        message: 'Задача удалена',
        deleted: task,
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

connectDB().then(() => {
  app.listen(process.env.PORT, () => {
    console.log('Стартуем!');
  });
}).catch((err) => {
  console.error('Ошибка подключения к MongoDB:', err);
  process.exit(1);
});
