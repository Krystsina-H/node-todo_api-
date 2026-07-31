// swagger.js
const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.0',

  info: {
    title: 'Tasks API',
    version: '1.0.0',
    description: 'API для управления задачами с JWT аутентификацией',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },

  servers: [
    {
      url: 'http://localhost:5001',
      description: 'Development server',
    },
    {
      url: 'https://node-todo-api-binb.onrender.com',
      description: 'Production server (Render)',
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Токен из POST /login. Вставляй сам токен, без слова Bearer — Swagger подставит его сам.',
      },
    },
    schemas: {
      Task: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
            description: 'Уникальный идентификатор задачи',
          },
          userId: {
            type: 'string',
            format: 'uuid',
            example: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
            description: 'ID пользователя, которому принадлежит задача',
          },
          title: {
            type: 'string',
            minLength: 3,
            example: 'Купить молоко',
            description: 'Название задачи',
          },
          completed: {
            type: 'boolean',
            example: false,
            description: 'Статус выполнения задачи',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Произошла ошибка',
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Операция выполнена успешно',
          },
        },
      },
    },
  },

  paths: {
    '/register': {
      post: {
        summary: 'Регистрация нового пользователя',
        description: 'Создает нового пользователя с хешированным паролем',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                  password: {
                    type: 'string',
                    minLength: 8,
                    example: 'password123',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Пользователь создан успешно',
            content: {
              'application/json': {
                example: {
                  id: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
                  email: 'user@example.com',
                },
              },
            },
          },
          409: {
            description: 'Email уже занят',
            content: {
              'application/json': {
                example: { error: 'Email уже занят' },
              },
            },
          },
          400: {
            description: 'Неверные данные',
            content: {
              'application/json': {
                example: { error: 'Неверный формат email или пароль' },
              },
            },
          },
        },
      },
    },

    '/login': {
      post: {
        summary: 'Вход в систему',
        description: 'Аутентификация пользователя и получение JWT токена',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                  password: {
                    type: 'string',
                    example: 'password123',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Успешный вход, возвращает JWT токен',
            content: {
              'application/json': {
                example: {
                  token:
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjlmMWM4ZDNlLTdiNGEtNGM1ZC04ZTlmLTFhMmIzYzRkNWU2ZiIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImlhdCI6MTc4NDk1ODAzNiwiZXhwIjoxNzg0OTYxNjM2fQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                },
              },
            },
          },
          401: {
            description: 'Неверный email или пароль',
            content: {
              'application/json': {
                example: { error: 'Неверный email или пароль' },
              },
            },
          },
        },
      },
    },

    '/tasks': {
      get: {
        summary: 'Получить все задачи пользователя',
        description:
          'Возвращает список всех задач текущего пользователя с возможностью фильтрации',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'completed',
            schema: {
              type: 'boolean',
            },
            description:
              'Фильтр по статусу выполнения (true - выполненные, false - невыполненные)',
            example: false,
          },
        ],
        responses: {
          200: {
            description: 'Список задач пользователя',
            content: {
              'application/json': {
                example: {
                  count: 2,
                  tasks: [
                    {
                      id: '123e4567-e89b-12d3-a456-426614174000',
                      userId: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
                      title: 'Купить молоко',
                      completed: false,
                    },
                    {
                      id: '223e4567-e89b-12d3-a456-426614174001',
                      userId: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
                      title: 'Сделать домашнее задание',
                      completed: true,
                    },
                  ],
                },
              },
            },
          },
          401: {
            description: 'Токен невалиден или истёк',
            content: {
              'application/json': {
                example: { error: 'Токен невалиден' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Создать новую задачу',
        description: 'Создает новую задачу для текущего пользователя',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 255,
                    example: 'Купить молоко',
                    description: 'Название задачи',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Задача создана успешно',
            content: {
              'application/json': {
                example: {
                  message: 'Задача создана успешно',
                  task: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    userId: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
                    title: 'Купить молоко',
                    completed: false,
                  },
                },
              },
            },
          },
          400: {
            description: 'Неверные данные',
            content: {
              'application/json': {
                example: {
                  error: 'Название задачи должно содержать минимум 3 символа',
                },
              },
            },
          },
          401: {
            description: 'Токен невалиден или истёк',
            content: {
              'application/json': {
                example: { error: 'Токен невалиден' },
              },
            },
          },
        },
      },
    },

    '/tasks/{id}': {
      get: {
        summary: 'Получить задачу по ID',
        description:
          'Возвращает задачу с указанным ID, если она принадлежит текущему пользователю',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID задачи',
            schema: {
              type: 'string',
              format: 'uuid',
            },
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
        ],
        responses: {
          200: {
            description: 'Задача найдена',
            content: {
              'application/json': {
                example: {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  userId: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
                  title: 'Купить молоко',
                  completed: false,
                },
              },
            },
          },
          401: {
            description: 'Токен невалиден или истёк',
            content: {
              'application/json': {
                example: { error: 'Токен невалиден' },
              },
            },
          },
          403: {
            description: 'Нет доступа к этой задаче',
            content: {
              'application/json': {
                example: { error: 'Нет доступа к этой задаче' },
              },
            },
          },
          404: {
            description: 'Задача не найдена',
            content: {
              'application/json': {
                example: { error: 'задача не найдена' },
              },
            },
          },
        },
      },
      put: {
        summary: 'Полностью обновить задачу',
        description: 'Заменяет название задачи на новое',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID задачи',
            schema: {
              type: 'string',
              format: 'uuid',
            },
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 255,
                    example: 'Купить хлеб',
                    description: 'Новое название задачи',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Задача обновлена',
            content: {
              'application/json': {
                example: {
                  message: 'Задача обновлена успешно',
                  task: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    userId: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
                    title: 'Купить хлеб',
                    completed: false,
                  },
                },
              },
            },
          },
          401: {
            description: 'Токен невалиден или истёк',
            content: {
              'application/json': {
                example: { error: 'Токен невалиден' },
              },
            },
          },
          403: {
            description: 'Нет доступа к этой задаче',
            content: {
              'application/json': {
                example: { error: 'Нет доступа к этой задаче' },
              },
            },
          },
          404: {
            description: 'Задача не найдена',
            content: {
              'application/json': {
                example: { error: 'задача с id 123 не найдена' },
              },
            },
          },
        },
      },
      patch: {
        summary: 'Частично обновить задачу',
        description: 'Обновляет статус выполнения задачи',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID задачи',
            schema: {
              type: 'string',
              format: 'uuid',
            },
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['completed'],
                properties: {
                  completed: {
                    type: 'boolean',
                    example: true,
                    description: 'Новый статус выполнения',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Статус задачи обновлен',
            content: {
              'application/json': {
                example: {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  userId: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
                  title: 'Купить молоко',
                  completed: true,
                },
              },
            },
          },
          401: {
            description: 'Токен невалиден или истёк',
            content: {
              'application/json': {
                example: { error: 'Токен невалиден' },
              },
            },
          },
          403: {
            description: 'Нет доступа к этой задаче',
            content: {
              'application/json': {
                example: { error: 'Нет доступа к этой задаче' },
              },
            },
          },
          404: {
            description: 'Задача не найдена',
            content: {
              'application/json': {
                example: { error: 'Задача с id 123 не найдена' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Удалить задачу',
        description:
          'Удаляет задачу с указанным ID, если она принадлежит текущему пользователю',
        tags: ['Tasks'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID задачи',
            schema: {
              type: 'string',
              format: 'uuid',
            },
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
        ],
        responses: {
          200: {
            description: 'Задача удалена',
            content: {
              'application/json': {
                example: {
                  message: 'Задача удалена',
                  deleted: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    userId: '9f1c8d3e-7b4a-4c5d-8e9f-1a2b3c4d5e6f',
                    title: 'Купить молоко',
                    completed: false,
                  },
                },
              },
            },
          },
          401: {
            description: 'Токен невалиден или истёк',
            content: {
              'application/json': {
                example: { error: 'Токен невалиден' },
              },
            },
          },
          403: {
            description: 'Нет доступа к этой задаче',
            content: {
              'application/json': {
                example: { error: 'Нет доступа к этой задаче' },
              },
            },
          },
          404: {
            description: 'Задача не найдена',
            content: {
              'application/json': {
                example: { error: 'задача с id 123 не найдена' },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = spec;
