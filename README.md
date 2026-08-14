# Node — REST API для управления задачами

Бэкенд-приложение на **Express 5** + **MongoDB** с JWT-аутентификацией и Swagger-документацией.

## Стек

- **Runtime:** Node.js (CommonJS)
- **Фреймворк:** Express 5
- **База данных:** MongoDB (Atlas)
- **Аутентификация:** JWT (jsonwebtoken) + bcryptjs
- **Валидация:** express-validator
- **Документация:** Swagger UI (swagger-jsdoc + swagger-ui-express)
- **Dev:** nodemon

## Структура проекта

```
node/
├── index.js          # Основной сервер — маршруты, middleware, подключение к MongoDB
├── validators.js     # Схемы валидации (express-validator) для всех эндпоинтов
├── swagger.js        # OpenAPI 3.0 спецификация для Swagger UI
├── example.js        # Закомментированный пример с файловым хранилищем (db.json)
├── db.json           # Локальный JSON-файл (использовался до перехода на MongoDB)
├── requests.http     # HTTP-запросы для тестирования (REST Client)
├── .env              # Переменные окружения
├── .gitignore
└── package.json
```

## Установка и запуск

```bash
npm install
npm run dev      # nodemon (hot reload)
npm start        # node index.js
npm run dev2     # nodemon example.js (файловый вариант)
```

## Переменные окружения (.env)

| Переменная       | Описание                        | Пример                                    |
|------------------|---------------------------------|-------------------------------------------|
| `PORT`           | Порт сервера                    | `5001`                                    |
| `MONGODB_URI`    | URI подключения к MongoDB       | `mongodb+srv://...`                       |
| `MONGO_DB_NAME`  | Имя базы данных                 | `lection_db`                              |
| `SECRET`         | Секрет для подписи JWT          | `'Секретное слово'`                       |
| `TOKEN_TTL`      | Время жизни токена              | `1h` (строка) или `3600` (секунды)       |

## API Эндпоинты

### Аутентификация

| Метод | Путь                   | Описание                    | Auth |
|-------|------------------------|-----------------------------|------|
| POST  | `/api/auth/register`   | Регистрация нового пользователя | ❌  |
| POST  | `/api/auth/login`      | Вход, получение JWT-токена  | ❌   |

**Тело запроса регистрации:**
```json
{ "name": "User", "email": "user@example.com", "password": "123456" }
```

**Тело запроса логина:**
```json
{ "email": "user@example.com", "password": "123456" }
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "User", "email": "user@example.com" }
}
```

### Задачи (Todos)

Все эндпоинты задач требуют заголовок `Authorization: Bearer <token>`.

| Метод  | Путь                    | Описание                            |
|--------|-------------------------|-------------------------------------|
| GET    | `/api/todos`            | Получить все задачи пользователя    |
| GET    | `/api/todos/:id`        | Получить задачу по ID              |
| POST   | `/api/todos`            | Создать новую задачу               |
| PUT    | `/api/todos/:id`        | Обновить название задачи           |
| PATCH  | `/api/todos/:id`        | Частичное обновление задачи        |
| PATCH  | `/api/todos/:id/toggle` | Переключить статус (completed)     |
| DELETE | `/api/todos/:id`        | Удалить задачу                     |

**Query-параметры для GET /api/todos:**
- `completed` — фильтр по статусу (`true` / `false`)

**Тело для создания задачи:**
```json
{ "title": "Купить молоко", "description": "2 литра, 3.2%" }
```

## Swagger UI

После запуска сервера документация доступна по адресу:

- **Swagger UI:** [http://localhost:5001/api-docs](http://localhost:5001/api-docs)
- **JSON-спецификация:** [http://localhost:5001/api-docs.json](http://localhost:5001/api-docs.json)

Корневой маршрут `/` редиректит на Swagger UI.

## Валидация

Входящие данные валидируются через `express-validator` (`validators.js`):

- `title` — строка, 3–100 символов
- `description` — строка, до 500 символов (опционально)
- `completed` — boolean
- `id` (param) — валидный MongoDB ObjectId
- `completed` (query) — boolean (опционально)

При ошибке валидации возвращается `400` с деталями:
```json
{
  "message": "Ошибка валидации.",
  "errors": [{ "type", "value", "message", "field", "location" }]
}
```

## Архитектура

1. **Auth middleware** — проверяет JWT-токен в заголовке `Authorization: Bearer <token>`, декодирует payload и кладёт `req.user`
2. **Ownership check** — каждый запрос к задачам проверяет, что `task.userId` совпадает с `req.user.id`
3. **MongoDB** — для каждого запроса открывается отдельное соединение, которое закрывается в `finally`
