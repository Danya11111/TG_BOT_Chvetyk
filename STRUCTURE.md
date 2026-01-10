# Структура Telegram Бота с Mini App

## Архитектура системы

```
┌─────────────────────────────────────────────────────────────┐
│                     Telegram Client                          │
│  ┌──────────────┐              ┌──────────────────────┐     │
│  │ Telegram Bot │ ◄──────────► │  Telegram Mini App   │     │
│  │  (commands,  │              │   (WebApp Frontend)  │     │
│  │ notifications)│              │                      │     │
│  └──────┬───────┘              └──────────┬───────────┘     │
└─────────┼──────────────────────────────────┼─────────────────┘
          │                                  │
          │                                  │
┌─────────▼──────────────────────────────────▼─────────────────┐
│                    Backend Server                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Layer (REST/GraphQL)                │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  - Orders API                                         │   │
│  │  - Products API                                       │   │
│  │  - Cart API                                           │   │
│  │  - User API                                           │   │
│  │  - Bonus API                                          │   │
│  │  - Notifications API                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Business Logic Layer                      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  - Order Service                                      │   │
│  │  - Product Service                                    │   │
│  │  - Cart Service                                       │   │
│  │  - Bonus Service                                      │   │
│  │  - Notification Service                               │   │
│  │  - Delivery Calculator                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Data Layer                               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  - Database (PostgreSQL/MongoDB)                     │   │
│  │  - Cache (Redis)                                     │   │
│  │  - File Storage                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
          │
          │
┌─────────▼────────────────────────────────────────────────────┐
│          External Services Integration                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Posiflora Accounting System API               │   │
│  │  - Order Creation                                     │   │
│  │  - Order Status Sync                                  │   │
│  │  - Bonus Information                                  │   │
│  │  - Product Catalog Sync                               │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Структура проекта

```
TG_BOT_Chvetyk/
│
├── backend/                          # Серверная часть
│   ├── src/
│   │   ├── bot/                      # Telegram Bot логика
│   │   │   ├── bot.ts                # Инициализация бота
│   │   │   ├── commands/             # Команды бота
│   │   │   │   ├── start.ts
│   │   │   │   ├── help.ts
│   │   │   │   └── menu.ts
│   │   │   ├── handlers/             # Обработчики событий
│   │   │   │   ├── message.handler.ts
│   │   │   │   ├── callback.handler.ts
│   │   │   │   └── webapp.handler.ts
│   │   │   └── notifications/        # Уведомления
│   │   │       ├── order.notifications.ts
│   │   │       └── manager.notifications.ts
│   │   │
│   │   ├── api/                      # REST API
│   │   │   ├── routes/
│   │   │   │   ├── orders.routes.ts
│   │   │   │   ├── products.routes.ts
│   │   │   │   ├── cart.routes.ts
│   │   │   │   ├── users.routes.ts
│   │   │   │   ├── bonus.routes.ts
│   │   │   │   └── webapp.routes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── orders.controller.ts
│   │   │   │   ├── products.controller.ts
│   │   │   │   ├── cart.controller.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   └── bonus.controller.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── validation.middleware.ts
│   │   │   │   └── error.middleware.ts
│   │   │   └── app.ts                # Express/Fastify приложение
│   │   │
│   │   ├── services/                 # Бизнес-логика
│   │   │   ├── order.service.ts
│   │   │   ├── product.service.ts
│   │   │   ├── cart.service.ts
│   │   │   ├── bonus.service.ts
│   │   │   ├── delivery.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── posiflora.service.ts  # Интеграция с posiflora
│   │   │
│   │   ├── models/                   # Модели данных
│   │   │   ├── user.model.ts
│   │   │   ├── order.model.ts
│   │   │   ├── product.model.ts
│   │   │   ├── cart.model.ts
│   │   │   └── bonus.model.ts
│   │   │
│   │   ├── database/                 # Работа с БД
│   │   │   ├── connection.ts
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   │
│   │   ├── integrations/             # Внешние интеграции
│   │   │   ├── posiflora/
│   │   │   │   ├── client.ts         # HTTP клиент для posiflora API
│   │   │   │   ├── order.integration.ts
│   │   │   │   ├── bonus.integration.ts
│   │   │   │   └── product.integration.ts
│   │   │   └── telegram/
│   │   │       └── webapp.helper.ts
│   │   │
│   │   ├── utils/                    # Утилиты
│   │   │   ├── logger.ts
│   │   │   ├── validator.ts
│   │   │   ├── errors.ts
│   │   │   └── constants.ts
│   │   │
│   │   └── config/                   # Конфигурация
│   │       ├── index.ts
│   │       ├── database.config.ts
│   │       └── posiflora.config.ts
│   │
│   ├── tests/                        # Тесты
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                         # Mini App (WebApp)
│   ├── src/
│   │   ├── components/               # React/Vue компоненты
│   │   │   ├── common/
│   │   │   │   ├── Button/
│   │   │   │   ├── Input/
│   │   │   │   ├── Card/
│   │   │   │   ├── Loading/
│   │   │   │   └── Modal/
│   │   │   ├── catalog/
│   │   │   │   ├── ProductCard/
│   │   │   │   ├── ProductList/
│   │   │   │   ├── CategoryFilter/
│   │   │   │   └── SearchBar/
│   │   │   ├── cart/
│   │   │   │   ├── CartItem/
│   │   │   │   ├── CartList/
│   │   │   │   ├── CartSummary/
│   │   │   │   └── EmptyCart/
│   │   │   ├── order/
│   │   │   │   ├── OrderForm/
│   │   │   │   ├── DeliveryForm/
│   │   │   │   ├── PickupForm/
│   │   │   │   ├── ContactForm/
│   │   │   │   └── OrderConfirmation/
│   │   │   ├── bonus/
│   │   │   │   ├── BonusDisplay/
│   │   │   │   └── BonusInfo/
│   │   │   └── about/
│   │   │       ├── AboutSection/
│   │   │       └── ContactLinks/
│   │   │
│   │   ├── pages/                    # Страницы приложения
│   │   │   ├── Home/
│   │   │   ├── Catalog/
│   │   │   ├── ProductDetail/
│   │   │   ├── Cart/
│   │   │   ├── Checkout/
│   │   │   ├── OrderStatus/
│   │   │   ├── Bonus/
│   │   │   └── About/
│   │   │
│   │   ├── hooks/                    # React hooks / Composables
│   │   │   ├── useTelegram.ts        # Telegram WebApp API
│   │   │   ├── useCart.ts
│   │   │   ├── useProducts.ts
│   │   │   ├── useOrders.ts
│   │   │   └── useBonus.ts
│   │   │
│   │   ├── store/                    # State management (Redux/Zustand/Vuex)
│   │   │   ├── slices/
│   │   │   │   ├── cart.slice.ts
│   │   │   │   ├── products.slice.ts
│   │   │   │   ├── user.slice.ts
│   │   │   │   └── orders.slice.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── api/                      # API клиент
│   │   │   ├── client.ts             # HTTP клиент (axios/fetch)
│   │   │   ├── endpoints.ts          # API endpoints
│   │   │   ├── orders.api.ts
│   │   │   ├── products.api.ts
│   │   │   ├── cart.api.ts
│   │   │   └── bonus.api.ts
│   │   │
│   │   ├── utils/                    # Утилиты
│   │   │   ├── formatters.ts         # Форматирование цен, дат
│   │   │   ├── validators.ts         # Валидация форм
│   │   │   ├── storage.ts            # LocalStorage/IndexedDB
│   │   │   └── constants.ts
│   │   │
│   │   ├── types/                    # TypeScript типы
│   │   │   ├── product.types.ts
│   │   │   ├── order.types.ts
│   │   │   ├── cart.types.ts
│   │   │   └── telegram.types.ts
│   │   │
│   │   ├── styles/                   # Стили
│   │   │   ├── global.css
│   │   │   ├── variables.css
│   │   │   └── themes/
│   │   │
│   │   ├── assets/                   # Статические ресурсы
│   │   │   ├── images/
│   │   │   ├── icons/
│   │   │   └── fonts/
│   │   │
│   │   ├── App.tsx                   # Главный компонент
│   │   ├── router.tsx                # Маршрутизация
│   │   └── main.tsx                  # Точка входа
│   │
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   │
│   ├── package.json
│   ├── vite.config.ts                # или webpack.config.js
│   ├── tsconfig.json
│   └── .env.example
│
├── shared/                           # Общий код (опционально)
│   ├── types/                        # Общие типы
│   └── constants/                    # Общие константы
│
├── docs/                             # Документация
│   ├── api.md                        # API документация
│   ├── deployment.md                 # Инструкции по развертыванию
│   ├── posiflora-integration.md      # Документация интеграции
│   └── architecture.md               # Архитектура системы
│
├── docker/                           # Docker конфигурация
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
│
├── .gitignore
├── README.md
└── STRUCTURE.md                      # Этот файл
```

## Технологический стек (рекомендуемый)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js / Fastify / NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL / MongoDB
- **Cache**: Redis
- **ORM/ODM**: Prisma / TypeORM / Mongoose
- **Telegram Bot**: node-telegram-bot-api / telegraf
- **Validation**: Joi / Zod / class-validator
- **Testing**: Jest / Mocha

### Frontend (Mini App)
- **Framework**: React / Vue.js / Svelte
- **Language**: TypeScript
- **State Management**: Redux / Zustand / Vuex / Pinia
- **Routing**: React Router / Vue Router
- **Build Tool**: Vite / Webpack
- **UI Library**: Material-UI / Ant Design / Tailwind CSS
- **HTTP Client**: Axios / Fetch API
- **Telegram WebApp**: @twa-dev/sdk

### DevOps
- **Containerization**: Docker
- **CI/CD**: GitHub Actions / GitLab CI
- **Hosting**: VPS / Cloud (AWS, DigitalOcean, etc.)
- **Reverse Proxy**: Nginx

## Основные модули и их функции

### 1. Telegram Bot Module
- Обработка команд (`/start`, `/help`, `/menu`)
- Отправка уведомлений о статусах заказов
- Запуск Mini App через кнопку или команду
- Уведомления менеджерам о новых заказах

### 2. Mini App Frontend
- **Каталог товаров**: отображение, фильтрация, поиск
- **Корзина**: добавление/удаление, изменение количества, сохранение
- **Оформление заказа**: формы ввода данных, выбор доставки/самовывоза
- **Бонусы**: отображение текущих бонусов, начисляемых за заказ
- **О нас**: информация о компании, ссылки на соцсети/сайт
- **Статусы заказов**: просмотр истории и текущих заказов

### 3. Backend API
- REST API для всех операций Mini App
- Валидация данных
- Аутентификация через Telegram WebApp
- Обработка бизнес-логики

### 4. Posiflora Integration
- Синхронизация каталога товаров
- Создание заказов в системе учёта
- Получение статусов заказов
- Получение информации о бонусах
- Синхронизация данных о пользователях

### 5. Notification System
- Уведомления пользователей в Telegram
- Уведомления менеджеров в Telegram (группа/канал)
- Email уведомления (опционально)

### 6. Delivery & Pickup Logic
- Расчёт стоимости доставки (по зонам/расстоянию)
- Информация о точках самовывоза
- Карты/ссылки на карты для самовывоза

## Потоки данных

### Оформление заказа
```
User (Mini App) 
  → Add to Cart 
  → Backend API 
  → Save to DB/Redis
  → User confirms order
  → Backend validates data
  → Backend creates order in Posiflora
  → Backend saves order to DB
  → Backend sends notification to Manager
  → Backend sends confirmation to User via Bot
  → Mini App shows confirmation
```

### Синхронизация статусов
```
Posiflora Webhook/API Polling
  → Backend receives status update
  → Backend updates order in DB
  → Backend sends notification to User via Bot
  → Mini App can fetch updated status
```

### Расчёт бонусов
```
User adds product to cart
  → Backend calculates potential bonus
  → Backend requests bonus info from Posiflora
  → Backend returns bonus info to Mini App
  → Mini App displays bonus
```

## Безопасность

- Валидация всех входных данных
- Проверка подписи Telegram WebApp данных
- Хеширование чувствительных данных
- Rate limiting для API
- CORS настройки
- Защита от SQL инъекций (ORM)
- Логирование всех критических операций
