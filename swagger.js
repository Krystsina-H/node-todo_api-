const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.0',

  info: {
    title: 'Todos API',
    version: '2.0.0',
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
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Токен из POST /api/auth/login. Вставляй сам токен, без слова Bearer — Swagger подставит его сам.',
      },
    },
    schemas: {
      Task: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '6a74cb17ab064faec53c1f45',
            description: 'Уникальный идентификатор задачи',
          },
          userId: {
            type: 'string',
            example: '6a74cb01ab064faec53c1f44',
            description: 'ID пользователя, которому принадлежит задача',
          },
          title: {
            type: 'string',
            minLength: 3,
            example: 'Купить молоко',
            description: 'Название задачи',
          },
          description: {
            type: 'string',
            example: '2 литра, 3.2%',
            description: 'Описание задачи',
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
            example: '6a74cb01ab064faec53c1f44',
          },
          name: {
            type: 'string',
            example: 'Test User',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          user: {
            $ref: '#/components/schemas/User',
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
    },
  },

  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Регистрация нового пользователя',
        description: 'Создает нового пользователя с хешированным паролем и возвращает JWT токен',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: {
                    type: 'string',
                    example: 'Test User',
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                  password: {
                    type: 'string',
                    minLength: 6,
                    example: '123456',
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
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
                example: {
                  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  user: {
                    id: '6a74cb01ab064faec53c1f44',
                    name: 'Test User',
                    email: 'user@example.com',
                  },
                },
              },
            },
          },
          400: {
            description: 'Пользователь уже существует или неверные данные',
            content: {
              'application/json': {
                example: { error: 'Пользователь уже существует' },
              },
            },
          },
        },
      },
    },

    '/api/auth/login': {
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
                    example: '123456',
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
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
                example: {
                  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  user: {
                    id: '6a74cb01ab064faec53c1f44',
                    name: 'Test User',
                    email: 'user@example.com',
                  },
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

    '/api/todos': {
      get: {
        summary: 'Получить все задачи пользователя',
        description:
          'Возвращает список всех задач текущего пользователя с возможностью фильтрации',
        tags: ['Todos'],
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
                  data: [
                    {
                      id: '6a74cb17ab064faec53c1f45',
                      userId: '6a74cb01ab064faec53c1f44',
                      title: 'Купить молоко',
                      description: '',
                      completed: false,
                    },
                    {
                      id: '6a74cb17ab064faec53c1f46',
                      userId: '6a74cb01ab064faec53c1f44',
                      title: 'Сделать домашнее задание',
                      description: 'Математика и физика',
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
        tags: ['Todos'],
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
                    maxLength: 100,
                    example: 'Купить молоко',
                    description: 'Название задачи',
                  },
                  description: {
                    type: 'string',
                    maxLength: 500,
                    example: '2 литра, 3.2%',
                    description: 'Описание задачи',
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
                  id: '6a74cb17ab064faec53c1f45',
                  userId: '6a74cb01ab064faec53c1f44',
                  title: 'Купить молоко',
                  description: '',
                  completed: false,
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

    '/api/todos/{id}': {
      get: {
        summary: 'Получить задачу по ID',
        description:
          'Возвращает задачу с указанным ID, если она принадлежит текущему пользователю',
        tags: ['Todos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID задачи',
            schema: {
              type: 'string',
            },
            example: '6a74cb17ab064faec53c1f45',
          },
        ],
        responses: {
          200: {
            description: 'Задача найдена',
            content: {
              'application/json': {
                example: {
                  id: '6a74cb17ab064faec53c1f45',
                  userId: '6a74cb01ab064faec53c1f44',
                  title: 'Купить молоко',
                  description: '',
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
                example: { error: 'Задача не найдена' },
              },
            },
          },
        },
      },
      put: {
        summary: 'Обновить название задачи',
        description: 'Заменяет название задачи на новое',
        tags: ['Todos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID задачи',
            schema: {
              type: 'string',
            },
            example: '6a74cb17ab064faec53c1f45',
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
                    maxLength: 100,
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
                  id: '6a74cb17ab064faec53c1f45',
                  userId: '6a74cb01ab064faec53c1f44',
                  title: 'Купить хлеб',
                  description: '',
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
                example: { error: 'Задача не найдена' },
              },
            },
          },
        },
      },
      patch: {
        summary: 'Частично обновить задачу',
        description: 'Обновляет поля задачи (title, description, completed)',
        tags: ['Todos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID задачи',
            schema: {
              type: 'string',
            },
            example: '6a74cb17ab064faec53c1f45',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    example: 'Купить хлеб',
                  },
                  description: {
                    type: 'string',
                    example: 'Бородинский',
                  },
                  completed: {
                    type: 'boolean',
                    example: true,
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
                  id: '6a74cb17ab064faec53c1f45',
                  userId: '6a74cb01ab064faec53c1f44',
                  title: 'Купить хлеб',
                  description: 'Бородинский',
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
                example: { error: 'Задача не найдена' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Удалить задачу',
        description:
          'Удаляет задачу с указанным ID, если она принадлежит текущему пользователю',
        tags: ['Todos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID задачи',
            schema: {
              type: 'string',
            },
            example: '6a74cb17ab064faec53c1f45',
          },
        ],
        responses: {
          200: {
            description: 'Задача удалена',
            content: {
              'application/json': {
                example: {
                  message: 'Задача удалена',
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
                example: { error: 'Задача не найдена' },
              },
            },
          },
        },
      },
    },

    '/api/todos/{id}/toggle': {
      patch: {
        summary: 'Переключить статус задачи',
        description: 'Инвертирует статус completed задачи (true ↔ false)',
        tags: ['Todos'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID задачи',
            schema: {
              type: 'string',
            },
            example: '6a74cb17ab064faec53c1f45',
          },
        ],
        responses: {
          200: {
            description: 'Статус задачи переключен',
            content: {
              'application/json': {
                example: {
                  id: '6a74cb17ab064faec53c1f45',
                  userId: '6a74cb01ab064faec53c1f44',
                  title: 'Купить молоко',
                  description: '',
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
                example: { error: 'Задача не найдена' },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = spec;
