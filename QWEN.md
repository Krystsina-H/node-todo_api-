# Project: node — REST API для задач

## Запуск

- `npm run dev` — dev-сервер с nodemon (порт из .env, по умолчанию 5001)
- `npm start` — продакшн-запуск

## Env

Требуется `.env` с переменными: `PORT`, `MONGODB_URI`, `MONGO_DB_NAME`, `SECRET`, `TOKEN_TTL`

## Структура

- `index.js` — все маршруты, middleware, подключение к MongoDB
- `validators.js` — express-validator схемы
- `swagger.js` — OpenAPI 3.0 спецификация

## Конвенции

- CommonJS (`require` / `module.exports`)
- Express 5
- Каждый HTTP-обработчик открывает/закрывает своё MongoDB-соединение (new MongoClient → connect → finally close)
- Валидация через express-validator; ошибки обрабатываются через `handleValidationErrors`
- JWT-токен: header `Authorization: Bearer <token>`, middleware `auth`
- Ownership check: `task.userId` должен совпадать с `req.user.id`
- API-префикс: `/api/auth/*` и `/api/todos/*`
- Swagger UI доступен на `/api-docs`, корень `/` редиректит туда
- Сообщения об ошибках на русском языке
- `requests.http` содержит устаревшие пути (`/registration`, `/login`, `/tasks`) — текущие маршруты начинаются с `/api/`

## Известные проблемы

- `@sentry/node` и `swagger-jsdoc` объявлены в dependencies, но не используются в коде
- `db.json` — артефакт файлового хранилища, текущий код его не читает и не пишет
- MongoDB-соединение создаётся/уничтожается на каждый запрос — нет connection pooling

## Эндпоинты

- `POST /api/auth/register` — регистрация (name, email, password)
- `POST /api/auth/login` — логин (email, password)
- `GET /api/todos` — список задач (query: completed)
- `GET /api/todos/:id` — задача по ID
- `POST /api/todos` — создать задачу (title, description)
- `PUT /api/todos/:id` — заменить title
- `PATCH /api/todos/:id` — частичное обновление
- `PATCH /api/todos/:id/toggle` — переключить completed
- `DELETE /api/todos/:id` — удалить задачу
