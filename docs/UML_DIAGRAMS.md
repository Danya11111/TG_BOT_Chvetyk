# Диаграммы проекта: TG_BOT_Chvetyk (Mini App + Posiflora + Поддержка)

Подробные UML-диаграммы в Mermaid: компоненты, потоки данных, БД, API, фронтенд, бот, интеграции Posiflora, вкладка «Поддержка» и супергруппа.

---

## 1. Компонентная диаграмма (высокоуровневая)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TELEGRAM                                               │
│  ┌─────────────────┐    ┌─────────────────────────────────────────────────────────────┐  │
│  │   Telegram Bot  │    │              Mini App (WebView, React)                       │  │
│  │   (Telegraf)    │    │  Catalog | Product | Cart | Checkout | Profile | About       │  │
│  │ /start, /menu   │    │  BottomNav: Каталог, Корзина, Профиль, О нас                 │  │
│  │ кнопки меню     │    │  Profile: Адреса | Заказы | Поддержка                        │  │
│  │ callback        │    │  initData (Telegram) → API (X-Telegram-Init-Data)            │  │
│  └────────┬────────┘    └────────────────────────────┬────────────────────────────────┘  │
│           │                                            │                                   │
│           │         ┌──────────────────────────────────┘                                  │
│           │         │                                                                       │
│           ▼         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    Супергруппа (MANAGER_GROUP_CHAT_ID)                               │  │
│  │  • Общий чат заказов: уведомления о заказах, чеки, кнопки [✅ Подтвердить] [❌ Нет]  │  │
│  │  • Чаты с клиентами: по 1 чату на клиента при первом запросе в «Поддержка» (один    │  │
│  │    раз создаётся, потом переиспользуется). Общение клиента — в боте, не в группе.   │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ HTTPS / Webhook
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js, Express)                                        │
│  API: /api/products, /api/categories, /api/cart, /api/orders, /api/bonus,                │
│       /api/users, /api/pickup, /api/config                                                 │
│  Middlewares: telegram-auth, rate-limit, validate-request, error-handler                 │
│  /api/telegram/webhook (POST) — fallback для бота                                         │
└───────┬──────────────────────────────────────┬───────────────────────┬─────────────────┘
        │                                      │                         │
        ▼                                      ▼                         ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────────────────────────────────────┐
│  PostgreSQL   │  │     Redis       │  │  ВНЕШНИЕ СИСТЕМЫ                                │
│  users        │  │  кэш products,  │  │  • Posiflora — склад и витрина каталога,        │
│  products     │  │  categories     │  │    база клиентов (по телефону), бонусы,         │
│  categories   │  │  rate-limit     │  │    приём заказов с составом                     │
│  orders       │  └─────────────────┘  │                                                   │
│  order_items  │                      │                                                   │
│  carts        │                      │                                                   │
│  bonus_history│                      └─────────────────────────────────────────────────┘
│  pickup_points│
│  order_status_│
│  history      │
└───────────────┘
```

---

## 1.1. Сводная схема: откуда что берётся и куда уходит

| № | Откуда | Куда | Запрос / Действие (что шлём) | Ответ / Результат (что получаем) |
|---|--------|------|------------------------------|----------------------------------|
| **1** | Backend | Posiflora API | **GET** каталог/категории/товары | name, price, images, description, in_stock, category → `products`, `categories` |
| **2** | Mini App | Backend | **GET** /api/products, /api/categories, /api/products/:id | **data:** товары, категории; карточка — витрина в Catalog, Product |
| **3** | Backend | Posiflora API | **getClient(phone)**. Если телефон в TG — сразу; иначе после ⑦: customer_phone, customer_name | client_id, name → `users`; обновление/создание по `phone` |
| **4** | Backend | Posiflora API | **getBonusBalance(phone, ФИО)**, суммы заказов по категориям | balance → `users.bonus_balance`, `bonus_history`; отображение в Profile, Checkout |
| **5** | Mini App | Backend | **POST** /api/orders { customer, delivery, recipient, items } | { id, order_number, status }; Backend → `orders`, `order_items`; **Posiflora createOrder** (полный состав); супергруппа (ожидание оплаты, чек, кнопки) |
| **6** | Супергруппа (менеджер) | Backend (Webhook) | callback_query: **payment_confirm:N** или **payment_reject:N** | Backend: UPDATE `orders` (payment_status, status), INSERT `order_status_history`; answerCbQuery; бот: ЛС клиенту |
| **7** | Profile (кнопка «Поддержка») | Backend → Супергруппа | Найти/создать тред по user_id (support_threads.supergroup_topic_id) | Один тред на клиента; общение клиента — в боте |
| **8** | Mini App (Zustand) | LocalStorage | addItem, removeItem, updateQuantity (persist) | Корзина для Checkout; на бэкенд не уходит до ⑤ (cart API — заглушки) |

---

## 2. Диаграмма классов БД (таблицы и поля)

```mermaid
classDiagram
    class users {
        +id: SERIAL PK
        +telegram_id: BIGINT UNIQUE NOT NULL
        +telegram_username: VARCHAR(255)
        +name: VARCHAR(255)
        +phone: VARCHAR(50)
        +email: VARCHAR(255)
        +bonus_balance: DECIMAL(10,2) DEFAULT 0
        +created_at: TIMESTAMP
        +updated_at: TIMESTAMP
    }
    class categories {
        +id: SERIAL PK
        +posiflora_id: VARCHAR(255) UNIQUE
        +name: VARCHAR(255) NOT NULL
        +slug: VARCHAR(255) UNIQUE
        +parent_id: FK categories
        +description: TEXT
        +image_url: VARCHAR(500)
        +sort_order: INT
        +is_active: BOOLEAN
        +created_at: TIMESTAMP
        +updated_at: TIMESTAMP
    }
    class products {
        +id: SERIAL PK
        +posiflora_id: VARCHAR(255) UNIQUE
        +name: VARCHAR(255) NOT NULL
        +description: TEXT
        +price: DECIMAL(10,2) NOT NULL
        +old_price: DECIMAL(10,2)
        +currency: VARCHAR(10) DEFAULT RUB
        +category_id: FK categories
        +images: JSONB
        +article: VARCHAR(255)
        +sku: VARCHAR(255)
        +in_stock: BOOLEAN
        +stock_quantity: INT
        +bonus_percent: DECIMAL(5,2)
        +weight: DECIMAL(10,2)
        +attributes: JSONB
        +sort_order: INT
        +created_at: TIMESTAMP
        +updated_at: TIMESTAMP
    }
    class carts {
        +id: SERIAL PK
        +user_id: FK users
        +product_id: FK products
        +quantity: INT NOT NULL
        +created_at: TIMESTAMP
        +updated_at: TIMESTAMP
        UNIQUE(user_id, product_id)
    }
    class orders {
        +id: SERIAL PK
        +order_number: VARCHAR(100) UNIQUE NOT NULL
        +user_id: FK users
        +posiflora_order_id: VARCHAR(255)
        +customer_name: VARCHAR(255) NOT NULL
        +customer_phone: VARCHAR(50) NOT NULL
        +customer_email: VARCHAR(255)
        +status: VARCHAR(50) DEFAULT new
        +status_code: INT
        +delivery_type: VARCHAR(20) delivery|pickup
        +delivery_address: JSONB
        +pickup_point_id: FK pickup_points
        +delivery_cost: DECIMAL(10,2)
        +delivery_date: DATE
        +delivery_time: TIME
        +payment_type: VARCHAR(50)
        +payment_status: VARCHAR(50) DEFAULT pending
        +bonus_used: DECIMAL(10,2)
        +bonus_accrued: DECIMAL(10,2)
        +subtotal: DECIMAL(10,2)
        +total: DECIMAL(10,2)
        +comment: TEXT
        +source: VARCHAR(50) DEFAULT telegram_bot
        +recipient_name: VARCHAR(255)
        +recipient_phone: VARCHAR(50)
        +card_text: TEXT
        +payment_confirmed_by: BIGINT
        +payment_confirmed_at: TIMESTAMP
        +payment_rejected_by: BIGINT
        +payment_rejected_at: TIMESTAMP
        +created_at: TIMESTAMP
        +updated_at: TIMESTAMP
    }
    class order_items {
        +id: SERIAL PK
        +order_id: FK orders
        +product_id: FK products
        +product_name: VARCHAR(255) NOT NULL
        +product_price: DECIMAL(10,2) NOT NULL
        +quantity: INT NOT NULL
        +total: DECIMAL(10,2) NOT NULL
        +product_image: VARCHAR(500)
        +created_at: TIMESTAMP
    }
    class order_status_history {
        +id: SERIAL PK
        +order_id: FK orders
        +status: VARCHAR(50) NOT NULL
        +status_code: INT
        +comment: TEXT
        +changed_at: TIMESTAMP
    }
    class bonus_history {
        +id: SERIAL PK
        +user_id: FK users
        +order_id: FK orders
        +type: VARCHAR(50) accrued|used|expired|cancelled
        +amount: DECIMAL(10,2) NOT NULL
        +description: TEXT
        +created_at: TIMESTAMP
    }
    class pickup_points {
        +id: SERIAL PK
        +posiflora_id: VARCHAR(255) UNIQUE
        +name: VARCHAR(255) NOT NULL
        +address: JSONB NOT NULL
        +working_hours: JSONB
        +phone: VARCHAR(50)
        +description: TEXT
        +image_url: VARCHAR(500)
        +map_url: VARCHAR(500)
        +coordinates: JSONB
        +is_active: BOOLEAN
        +sort_order: INT
        +created_at: TIMESTAMP
        +updated_at: TIMESTAMP
    }
    class support_threads {
        +id: SERIAL PK
        +user_id: FK users
        +telegram_id: BIGINT
        +supergroup_topic_id: INT
        +created_at: TIMESTAMP
    }
    users "1" --> "*" orders : user_id
    users "1" --> "*" carts : user_id
    users "1" --> "*" bonus_history : user_id
    users "1" --> "0..1" support_threads : user_id
    categories "1" --> "*" products : category_id
    products "1" --> "*" order_items : product_id
    orders "1" --> "*" order_items : order_id
    orders "1" --> "*" order_status_history : order_id
    orders "0..1" --> "1" pickup_points : pickup_point_id
```

---

## 3. API Backend — маршруты, методы и поля

| № | Откуда | Куда | Запрос / Действие (что шлём) | Ответ / Результат (что получаем) |
|---|--------|------|------------------------------|----------------------------------|
| **1** | Mini App | Backend | **GET** /api/products. query: categoryId, categorySlug, search, inStock, minPrice, maxPrice, page, limit, sort | `{ data: Product[], pagination }` |
| **2** | Mini App | Backend | **GET** /api/products/:id. params: id | `Product` |
| **3** | Mini App | Backend | **GET** /api/categories | `Category[]` |
| **4** | Mini App | Backend | **GET** /api/categories/:id. params: id | `Category` |
| **5** | Mini App | Backend | **GET** /api/cart (auth: telegram). query: userId | `{ userId, items, total }` (пока заглушка) |
| **6** | Mini App | Backend | **POST** /api/cart (auth: telegram). body: {} | `{ message }` (заглушка) |
| **7** | Mini App | Backend | **DELETE** /api/cart/:productId (auth: telegram). params: productId | `{ message }` (заглушка) |
| **8** | Mini App | Backend | **POST** /api/orders (auth: telegram). body: createOrderSchema | `{ id, order_number, total, status, payment_status, createdAt }` |
| **9** | Mini App | Backend | **GET** /api/orders (auth: telegram) | `{ orders: [{ id, order_number, total, status, payment_status, created_at }] }` |
| **10** | Mini App | Backend | **GET** /api/orders/:id (auth: telegram). params: id | заказ + items + history |
| **11** | Mini App | Backend | **POST** /api/orders/:id/receipt (auth: telegram). params: id; body: `{ imageDataUrl, fileName? }` | `{ ok: true }` → в супергруппу чек + кнопки |
| **12** | Mini App | Backend | **GET** /api/bonus/balance (auth: telegram). query: userId | `{ userId, balance, message }` (заглушка до Posiflora) |
| **13** | Mini App | Backend | **POST** /api/bonus/calculate (auth: telegram). body: {} | `{ bonusesToAccrue, message }` (заглушка) |
| **14** | Mini App | Backend | **GET** /api/users/:telegramId (auth: telegram). params: telegramId | пользователь |
| **15** | Mini App | Backend | **GET** /api/pickup/points (auth: telegram) | `[]` (заглушка до Posiflora) |
| **16** | Mini App | Backend | **POST** /api/pickup/calculate (auth: telegram). body: {} | `{ deliveryCost, message }` (заглушка) |
| **17** | Mini App | Backend | **GET** /api/config | `{ brand, delivery, contacts, ... }` |

### Схема `createOrderSchema` (body POST /api/orders)

```yaml
customer: { name, phone, email? }
delivery:
  type: delivery | pickup
  address: { city, street, house, apartment?, postalCode? }  # если delivery
  pickupPointId?: number  # если pickup
  date: string
  time: string
recipient: { name, phone }
cardText: string
comment?: string
paymentType: card_requisites | sbp_qr
items: [ { productId, productName, price, quantity, image? } ]
```

---

## 4. Frontend — страницы, навигация, хранилища

```mermaid
flowchart TB
    subgraph Routes
        R1["/ → /catalog"]
        R2["/catalog"]
        R3["/product/:id"]
        R4["/cart"]
        R5["/checkout"]
        R6["/about"]
        R7["/profile"]
    end

    subgraph Pages
        Catalog["Catalog"]
        Product["Product"]
        Cart["Cart"]
        Checkout["Checkout"]
        About["About"]
        Profile["Profile"]
    end

    subgraph Stores
        cart_store["cart.store: items, addItem, removeItem, updateQuantity, clearCart, getTotal, getItemCount"]
        catalog_store["catalog.store: categories, products, fetchCategories, fetchProducts, setCategory, searchQuery, filters"]
        product_store["product.store: product, fetchProduct, reset"]
        checkout_store["checkout.store: formData, saveFormData, clearFormData"]
        profile_store["profile.store: addresses, addAddress, updateAddress, removeAddress"]
    end

    subgraph API
        getProducts["GET /api/products"]
        getProduct["GET /api/products/:id"]
        getCategories["GET /api/categories"]
        getConfig["GET /api/config"]
        createOrder["POST /api/orders"]
        getOrders["GET /api/orders"]
        getOrderStatus["GET /api/orders/:id"]
        uploadReceipt["POST /api/orders/:id/receipt"]
    end

    R2 --> Catalog
    R3 --> Product
    R4 --> Cart
    R5 --> Checkout
    R6 --> About
    R7 --> Profile

    Catalog --> catalog_store
    Catalog --> cart_store
    Product --> product_store
    Product --> cart_store
    Cart --> cart_store
    Checkout --> cart_store
    Checkout --> checkout_store
    Checkout --> profile_store
    Profile --> profile_store
    Profile --> getOrders
    Profile --> getOrderStatus

    catalog_store --> getProducts
    catalog_store --> getCategories
    product_store --> getProduct
    useCustomerConfig --> getConfig
    Checkout --> createOrder
    Checkout --> uploadReceipt
```

### Профиль — вкладки

| № | Откуда | Куда | Запрос / Действие (что шлём) | Ответ / Результат (что получаем) |
|---|--------|------|------------------------------|----------------------------------|
| **1** | Profile (вкладка «Адреса») | profile.store (localStorage) | addAddress, updateAddress, removeAddress | Адреса в store; отображение в Checkout |
| **2** | Profile (вкладка «Заказы») | Backend | **GET** /api/orders (auth) | `{ orders: [{ id, order_number, total, status, payment_status, created_at }] }` |
| **3** | Profile (вкладка «Заказы», «Подробнее») | Backend | **GET** /api/orders/:id (auth). params: id | заказ + items + history; детали + история статусов |
| **4** | Profile (вкладка «Поддержка») | Backend → Супергруппа | Кнопка «Написать в поддержку»: найти/создать тред по user_id (support_threads.supergroup_topic_id) | Один тред на клиента; общение клиента — в боте |

### BottomNavigation

- Каталог → `/catalog`
- Корзина → `/cart`
- Профиль → `/profile`
- О нас → `/about`

---

## 5. Бот — команды, обработчики, callback

```mermaid
flowchart LR
    subgraph Commands
        start["/start"]
        menu["/menu"]
        help["/help"]
    end

    subgraph Handlers
        handleStart["start.ts: приветствие, кнопка 'Открыть каталог' (WebApp)"]
        handleMenu["menu.ts: кнопка WebApp каталог"]
        handleMessage["message.handler: СТАРТ, Мои заказы, Мои бонусы, О нас, Помощь"]
        handleCallback["callback.handler: payment_confirm:N, payment_reject:N"]
        handleWebApp["webapp.handler: данные из Mini App"]
    end

    subgraph Notifications
        notifyManagerPaymentRequest["order.notifications → супергруппа: ожидание оплаты"]
        notifyManagerPaymentReceipt["manager.notifications: чек + кнопки [✅][❌] в супергруппу"]
        notifyOrderStatusUpdate["order.notifications: клиенту в ЛС при смене статуса"]
    end

    start --> handleStart
    menu --> handleMenu
    "текст сообщения" --> handleMessage
    "callback_query" --> handleCallback
    "WebApp data" --> handleWebApp

    orders.create --> notifyManagerPaymentRequest
    orders.uploadReceipt --> notifyManagerPaymentReceipt
    callback "confirm/reject" --> orders UPDATE
    callback "confirm/reject" --> notifyOrderStatusUpdate
```

### Callback `payment_confirm:N` / `payment_reject:N`

- Приходит из супергруппы (проверка `message.chat.id === MANAGER_GROUP_CHAT_ID`).
- `payment_confirm` → `payment_status=confirmed`, `status=confirmed`, `payment_confirmed_by`, `payment_confirmed_at`; `order_status_history`.
- `payment_reject` → `payment_status=rejected`, `status=cancelled`, `payment_rejected_by`, `payment_rejected_at`; `order_status_history`.
- Клиенту в ЛС: «Оплата подтверждена» / «Оплата не прошла».
- Редактирование сообщения в группе: убрать кнопки, дописать «Оплата подтверждена/не прошла», менеджер, время.

---

## 6. Интеграция Posiflora

```mermaid
flowchart TB
    subgraph Posiflora
        P_clients["База клиентов"]
        P_bonuses["Бонусы по: сумма заказов, категории, телефон, ФИО"]
        P_orders["CRM: заказы с полным составом"]
    end

    subgraph Our_DB
        users
        orders
        order_items
        bonus_history
    end

    subgraph Sync_Logic
        by_phone["Сопоставление по номеру телефона"]
        if_tg_phone["Телефон есть в профиле TG?"]
        after_first["После первого заказа: телефон + имя из заказа"]
        bonus_calc["Бонусы: по сумме заказов по категориям, телефон, ФИО — полное сопоставление с Posiflora"]
        send_order["После создания заказа: отправить в Posiflora состав заказа (товары, суммы, доставка, получатель и т.д.)"]
    end

    P_clients --> by_phone
    by_phone --> if_tg_phone
    if_tg_phone -->|да| "Сразу использовать профиль Posiflora"
    if_tg_phone -->|нет| after_first
    after_first --> users
    users --> P_clients

    orders --> bonus_calc
    bonus_calc --> P_bonuses
    P_bonuses --> users
    users --> bonus_balance

    orders --> send_order
    order_items --> send_order
    send_order --> P_orders
```

### Поля для сопоставления с Posiflora

- **Клиент:** `phone` (основной ключ). Если в `users` есть `phone` из Telegram/профиля — сразу ищем в Posiflora. Иначе — после первого заказа: `customer_phone`, `customer_name` → обновить `users` и связать с Posiflora.
- **Бонусы:** по `phone`, `name` (ФИО), суммы заказов по категориям → расчёт в Posiflora; результат — в `users.bonus_balance` и/или `bonus_history`.
- **Заказ в CRM:** после `POST /api/orders` — вызов API Posiflora: состав (order_items: product_name, product_price, quantity, total), доставка, получатель, комментарий, источник `telegram_mini_app`, `posiflora_order_id` сохранять в `orders.posiflora_order_id`.

### Posiflora API: минимальный набор для синхронизации (по UML)

Базовый URL: `https://<your-posiflora-domain>/api/v1`. Формат: `application/vnd.api+json`. Авторизация: `Bearer <accessToken>`.

| Поток UML | Метод | Endpoint | Что делаем | Примечания |
|---|---|---|---|---|
| Auth | **POST** | `/sessions` | Создать сессию | Тело: `{ data: { type:"sessions", attributes:{ username, password }}}` |
| Auth | **PATCH** | `/sessions` | Обновить токен | Тело: `{ data: { type:"sessions", attributes:{ refreshToken }}}` |
| ⑫ | **POST** | `/customers/filter-phone-numbers` | Быстрая проверка наличия телефонов | Тело: `{ data:{ type:"customer-phone-numbers", attributes:{ phoneNumbers:[...] }}}` |
| ⑫ | **GET** | `/customers?search=<phone>` | Найти клиента по телефону | `search` ищет по имени/телефону/карте |
| ⑫ | **GET** | `/customers/{id}` | Получить карточку клиента | Нужен `id` из списка |
| ⑫ | **POST** | `/customers` | Создать клиента при отсутствии | Тело: `data.type="customers"`, `attributes:{ title, phone, email?, birthday?, gender?, countryCode? }` |
| ⑫ | **PATCH** | `/customers/{id}` | Обновить клиента | Например, добавить имя/телефон/почту |
| ⑬ | **GET** | `/customers/{id}/bonus-history` | История бонусов | Возвращает начисления/списания |
| ⑭ | **POST** | `/orders` | Создать заказ в CRM | Передаём состав, суммы, доставку, получателя, source |
| (опц.) | **GET** | `/order-sources` | Справочник источников | Для поля `source` в заказе |

---

## 8. Поддержка: вкладка в профиле и супергруппа

```mermaid
flowchart TB
    subgraph Profile_Support["Профиль → вкладка Поддержка"]
        btn["Кнопка «Написать в поддержку»"]
    end

    subgraph On_Click["По нажатию"]
        find_or_create["Найти или создать чат клиента в супергруппе"]
        one_chat["Один чат на клиента (user_id/telegram_id) — всегда один, при повторных обращениях тот же чат"]
        open_bot["Переход в бота для общения (общение только в боте, не в группе)"]
    end

    subgraph Supergroup["Супергруппа (MANAGER_GROUP_CHAT_ID)"]
        threads["Треды/чаты с клиентами: по 1 на клиента при первом запросе в Поддержку"]
        orders_chat["Общий чат заказов: новые заказы, чеки, кнопки [✅ Подтвердить] [❌ Не оплачено] для менеджеров"]
    end

    btn --> find_or_create
    find_or_create --> one_chat
    one_chat --> open_bot
    find_or_create --> threads
    orders.create --> orders_chat
    orders.uploadReceipt --> orders_chat
    handleCallback --> orders_chat
```

### Поведение

- **Вкладка «Поддержка»:** кнопка «Написать в поддержку». По нажатию:
  - Найти или создать в супергруппе тред (topic) под этого клиента. Хранить `(user_id или telegram_id) → topic_id` в БД или конфиге, чтобы всегда использовать один и тот же тред.
  - Общение клиента — только в боте (в ЛС с ботом). В супергруппе пишут менеджеры; при необходимости — ретрансляция сообщений клиента из бота в тред.
- **Супергруппа:**
  - **Общий чат заказов (основной тред или без топика):** `notifyManagerPaymentRequest`, `notifyManagerPaymentReceipt` с кнопками. Callback `payment_confirm` / `payment_reject` обрабатываются здесь.
  - **Чаты с клиентами (отдельные топики):** один топик на клиента при первом обращении в «Поддержка»; при повторных — тот же топик. Ответы — в топике; клиент общается в боте.

**Хранение «один чат на клиента»:** таблица `support_threads` (user_id, telegram_id, supergroup_topic_id) или аналог, чтобы по `user_id`/`telegram_id` находить существующий топик в супергруппе и не создавать новый.

---

## 9. Поток создания заказа (от корзины до Posiflora и супергруппы)

```mermaid
sequenceDiagram
    actor U as Клиент
    participant M as Mini App
    participant API as Backend API
    participant DB as PostgreSQL
    participant PF as Posiflora
    participant Bot as Telegram Bot
    participant Grp as Супергруппа

    U->>M: Checkout: форма + «Оформить заказ»
    M->>API: POST /api/orders (createOrderSchema, initData)
    API->>DB: users: upsert по telegram_id
    API->>DB: orders + order_items + order_status_history
    API->>PF: (план) Отправить заказ с составом в CRM, сохранить posiflora_order_id
    API-->>M: { id, order_number, total, status, payment_status }

    M->>M: paymentStep = payment, показать реквизиты/QR и «Приложить чек»
    U->>M: Загрузить чек (фото)
    M->>API: POST /api/orders/:id/receipt { imageDataUrl, fileName }
    API->>Bot: notifyManagerPaymentReceipt(чек, orderId)
    Bot->>Grp: Фото чека + [✅ Подтвердить] [❌ Не оплачено]

    Mgr->>Grp: Нажимает [✅] или [❌]
    Grp->>Bot: callback_query payment_confirm:N | payment_reject:N
    Bot->>API: (обработка в callback.handler)
    Note over API,DB: UPDATE orders (payment_status, status, payment_confirmed_by/rejected_by)
    API->>DB: order_status_history
    Bot->>U: Сообщение в ЛС: «Оплата подтверждена» / «Оплата не прошла»
    Bot->>Grp: Редактирование сообщения: убрать кнопки, дописать результат
```

---

## 10. Синхронизация каталога и клиентов из Posiflora

```mermaid
flowchart LR
    subgraph Cron
        scheduler["posiflora/scheduler.ts: POSIFLORA_SYNC_CRON"]
    end

    subgraph catalog["posiflora/catalog.service.ts"]
        fetchCategories["GET /catalog/categories"]
        fetchItems["GET /catalog/{category}"]
        fetchDetails["GET /inventory-items/{id} (опц.)"]
        upsertCat["upsert categories"]
        upsertProd["upsert products"]
        cache_clear["cache.clearPattern products:*, categories:*"]
    end

    subgraph customers["posiflora/customers.service.ts"]
        fetchCustomers["GET /customers"]
        upsertCustomers["upsert posiflora_customers"]
    end

    subgraph DB
        categories
        products
        posiflora_customers
    end

    scheduler --> fetchCategories
    fetchCategories --> fetchItems
    fetchItems --> fetchDetails
    fetchItems --> upsertCat
    fetchDetails --> upsertProd
    upsertCat --> categories
    upsertProd --> products
    upsertProd --> cache_clear

    scheduler --> fetchCustomers
    fetchCustomers --> upsertCustomers
    upsertCustomers --> posiflora_customers
```

---

## 11. Конфиг и env

| Переменная | Назначение |
|------------|------------|
| `TELEGRAM_BOT_TOKEN` | Бот |
| `WEBAPP_URL` | URL Mini App |
| `MANAGER_TELEGRAM_IDS` | ЛС менеджеров (резерв, если нет группы) |
| `MANAGER_GROUP_CHAT_ID` | Супергруппа: заказы + чаты с клиентами по поддержке |
| `POSIFLORA_API_URL`, `POSIFLORA_USERNAME`, `POSIFLORA_PASSWORD` | Интеграция Posiflora |
| `POSIFLORA_SYNC_CRON`, `POSIFLORA_SYNC_ENABLED`, `POSIFLORA_SYNC_ON_STARTUP` | Синхронизация каталога |
| `POSIFLORA_CATALOG_PAGE_SIZE`, `POSIFLORA_INCLUDE_ITEM_DETAILS` | Каталог: страницы и детали |
| `POSIFLORA_CUSTOMERS_SYNC_ENABLED`, `POSIFLORA_CUSTOMERS_PAGE_SIZE` | Синхронизация клиентов |

---

## PlantUML — код для вставки

Ниже приведён код для [PlantUML](https://www.plantuml.com/plantuml). Можно вставлять каждый блок в сервис [plantuml.com](https://www.plantuml.com/plantuml/uml) или в плагин PlantUML (VS Code, IntelliJ).

---

### PlantUML: 1. Компонентная диаграмма — структура и потоки

Схема разбита на **4 зоны**. На стрелках — **номера обменов ①—⑰**; детали (что запрашивается, что возвращается) — в **таблице ниже**.

```plantuml
@startuml component
!theme plain
skinparam defaultFontSize 11
skinparam padding 8

title **Структура: 4 зоны. У стрелок — запрос → ответ; снизу — легенда ①—⑰**

' ---- ЗОНА 1: ИНТЕРФЕЙС (TELEGRAM) ----
rectangle "**1. ИНТЕРФЕЙС (Telegram)**" as Z1 #E8F4E8 {
  component [**Telegram Bot**\nTelegraf] as Bot
  component [**Mini App**\nReact, WebView] as MiniApp
  component [**Супергруппа**\nчаты заказов + треды поддержки] as Supergroup
}

' ---- ЗОНА 2: BACKEND ----
rectangle "**2. BACKEND**\nExpress, /api/*" as Z2 #E8E8F4 {
  component [**API + Posiflora sync**] as Backend
}

' ---- ЗОНА 3: ХРАНИЛИЩА ----
rectangle "**3. ХРАНИЛИЩА**" as Z3 #F4F0E8 {
  database "**PostgreSQL**\nusers, products, categories,\norders, order_items, ..." as DB
  component [**Redis**\nкэш, rate-limit] as Redis
}

' ---- ЗОНА 4: ВНЕШНИЕ API ----
rectangle "**4. ВНЕШНИЕ**" as Z4 #F4E8E8 {
  component [**Posiflora API**\nкаталог, клиенты, бонусы, заказы] as PF
}

' ===== ПОТОКИ: Mini App <-> Backend (на стрелках: запрос → ответ) =====
MiniApp -right-> Backend : **①** GET /api/products ?categoryId,search,page,limit\n→ data:[{id,name,price,images,in_stock}], pagination
MiniApp -right-> Backend : **②** GET /api/products/:id\n→ {id,name,price,images,in_stock,description}
MiniApp -right-> Backend : **③** GET /api/categories\n→ [{id,name,slug}]
MiniApp -right-> Backend : **④** GET /api/config\n→ {brand,delivery,contacts}
MiniApp -right-> Backend : **⑤** GET /api/orders\n→ {orders:[{id,order_number,total,status}]}
MiniApp -right-> Backend : **⑥** GET /api/orders/:id\n→ {id,items,history,delivery,recipient}
MiniApp -right-> Backend : **⑦** POST /api/orders {customer,delivery,recipient,items}\n→ {id,order_number,status,payment_status}
MiniApp -right-> Backend : **⑧** POST /api/orders/:id/receipt {imageDataUrl}\n→ {ok}; Backend шлёт чек в ⑯

Backend -left-> MiniApp : ответы ①—⑧: data / id,order_number,status / {ok}

' ===== ПОТОКИ: Bot <-> Backend =====
Bot -down-> Backend : **⑨** Webhook callback_query: payment_confirm:N | payment_reject:N\n→ UPDATE orders, order_status_history; answerCbQuery; бот: ЛС клиенту + edit сообщения в группе
Backend -up-> Bot : (ответ ⑨ — в Webhook)

' ===== ПОТОКИ: Backend -> Хранилища =====
Backend -down-> DB : **⑩** SELECT/INSERT/UPDATE users,products,orders,order_items,order_status_history,carts,bonus_history,support_threads\n→ строки (id,name,price,order_number,status,...)
Backend -down-> Redis : **⑪** get/set products:*, categories:*; incr rate-limit\n→ кэш (JSON) / счётчик

' ===== ПОТОКИ: Backend -> Внешние =====
Backend -down-> PF : **⑫** getClient(phone)\n→ client_id, name
Backend -down-> PF : **⑬** getBonusBalance(phone, ФИО)\n→ balance
Backend -down-> PF : **⑭** createOrder {items,delivery,recipient,source}\n→ posiflora_order_id → пишем в orders
Backend -down-> PF : **⑮** GET /catalog/categories + /catalog/{id}\n→ пишем в products, categories (⑩)

' ===== ПОТОКИ: Backend -> Супергруппа =====
Backend -up-> Supergroup : **⑯** sendMessage/sendPhoto: order_number,customer,items,чек; кнопки [✅][❌]\n→ сообщение в группе; нажатие → ⑨
Backend -up-> Supergroup : **⑰** тред по user_id (support_threads.supergroup_topic_id)\n→ 1 тред на клиента; общение в боте

' ===== ЛЕГЕНДА СНИЗУ: детали ①—⑰ (запрос → ответ) =====
legend bottom
  |= № |= Запрос (что шлём) |= Ответ (что получаем) |
  | ① | GET /api/products ?categoryId,search,inStock,minPrice,maxPrice,page,limit,sort | data:[{id,name,price,old_price,images,in_stock,category_id,description}], pagination |
  | ② | GET /api/products/:id | {id,name,price,old_price,images,in_stock,description,category_id,category_name,article} |
  | ③ | GET /api/categories | [{id,name,slug,image_url,sort_order}] |
  | ④ | GET /api/config | {brand:{displayName}, delivery:{city,zones}, contacts:{phone,email}} |
  | ⑤ | GET /api/orders (auth) | {orders:[{id,order_number,total,status,payment_status,created_at}]} |
  | ⑥ | GET /api/orders/:id (auth) | {id,order_number,total,status,delivery_type,delivery_address,recipient_name,recipient_phone,card_text,comment, items:[{product_name,product_price,quantity,total}], history:[{status,comment,changed_at}]} |
  | ⑦ | POST /api/orders (auth) body: customer{name,phone,email?}, delivery{type,address?,pickupPointId?,date,time}, recipient{name,phone}, cardText, paymentType, items[{productId,productName,price,quantity,image?}] | {id,order_number,total,status,payment_status,createdAt} |
  | ⑧ | POST /api/orders/:id/receipt (auth) body: {imageDataUrl,fileName?} | {ok}; side-effect: чек в Супергруппу с кнопками [✅][❌] (⑯) |
  | ⑨ | Webhook: callback_query data=payment_confirm:N | payment_reject:N, message.chat.id=MANAGER_GROUP_CHAT_ID | Backend: UPDATE orders (payment_status,status), INSERT order_status_history; answerCbQuery; бот: ЛС «Оплата подтверждена»/«не прошла», edit сообщения в группе |
  | ⑩ | SQL: SELECT/INSERT/UPDATE users,products,categories,orders,order_items,order_status_history,carts,bonus_history,pickup_points,support_threads | Строки: users{id,telegram_id,name,phone,bonus_balance}, products{id,name,price,images,in_stock,category_id}, orders{id,order_number,user_id,posiflora_order_id,total,status,payment_status,...}, order_items{...} |
  | ⑪ | get/set products:*, categories:*; incr rate-limit | Значения кэша (JSON); счётчик |
  | ⑫ | getClient(phone). Если нет в TG — после ⑦: customer_phone, customer_name | client_id, name |
  | ⑬ | getBonusBalance(phone, ФИО), суммы по категориям | balance → users.bonus_balance, bonus_history |
  | ⑭ | createOrder {items:[{name,price,quantity}], delivery, recipient, source:telegram_mini_app} (после ⑦) | posiflora_order_id → orders.posiflora_order_id |
| ⑮ | GET /catalog/categories + /catalog/{id} (Posiflora) | name,price,images,description,in_stock,category → ⑩ products, categories |
  | ⑯ | sendMessage (ожидание ⑦), sendPhoto (чек ⑧): order_number,customer_name,customer_phone,total,items; кнопки payment_confirm:N, payment_reject:N | Сообщение/фото в группе; нажатие → ⑨ |
  | ⑰ | Найти/создать тред по user_id (support_threads.supergroup_topic_id), «Поддержка» в Profile | 1 тред на клиента; общение в боте |
end legend

@enduml
```

---

### Таблица обменов: что запрашивается, откуда, что возвращается

По номерам **①—⑰** с диаграммы. По каждой строке: **откуда** → **куда**, **что отправляется/запрашивается**, **что получает обратно**.

| № | Откуда | Куда | Запрос / Действие (что шлём) | Ответ / Результат (что получаем) |
|---|--------|------|------------------------------|----------------------------------|
| **①** | Mini App | Backend | **GET** /api/products ?categoryId, categorySlug, search, inStock, minPrice, maxPrice, page, limit, sort. Заголовок: X-Telegram-Init-Data | **data:** [{ id, name, price, old_price, images, in_stock, category_id, category_name, description }], **pagination:** { page, limit, total, totalPages } |
| **②** | Mini App | Backend | **GET** /api/products/:id. Заголовок: X-Telegram-Init-Data | { id, name, price, old_price, images, in_stock, description, category_id, category_name, article } |
| **③** | Mini App | Backend | **GET** /api/categories | [{ id, name, slug, image_url, sort_order }] |
| **④** | Mini App | Backend | **GET** /api/config | { brand: { displayName }, delivery: { city, zones }, contacts: { phone, email } } |
| **⑤** | Mini App | Backend | **GET** /api/orders. Заголовок: X-Telegram-Init-Data (auth) | { orders: [{ id, order_number, total, status, payment_status, created_at }] } |
| **⑥** | Mini App | Backend | **GET** /api/orders/:id. Заголовок: X-Telegram-Init-Data (auth) | { id, order_number, total, status, payment_status, delivery_type, delivery_address, delivery_date, delivery_time, recipient_name, recipient_phone, card_text, comment, **items:** [{ product_name, product_price, quantity, total }], **history:** [{ status, comment, changed_at }] } |
| **⑦** | Mini App | Backend | **POST** /api/orders. **Body:** { **customer:** { name, phone, email? }, **delivery:** { type, address?: { city, street, house, apartment? }, pickupPointId?, date, time }, **recipient:** { name, phone }, **cardText,** **comment?,** **paymentType,** **items:** [{ productId, productName, price, quantity, image? }] }. Заголовок: X-Telegram-Init-Data (auth) | { id, order_number, total, status, payment_status, createdAt } |
| **⑧** | Mini App | Backend | **POST** /api/orders/:id/receipt. **Body:** { imageDataUrl, fileName? }. Заголовок: X-Telegram-Init-Data (auth) | { ok: true }. Бок-эффект: Backend шлёт чек в Супергруппу (**⑯**) с кнопками [✅][❌] |
| **⑨** | Telegram Bot | Backend | **Webhook** (POST). **Тело:** callback_query { data: "payment_confirm:N" или "payment_reject:N", message: { chat: { id } } }. Chat.id должен = MANAGER_GROUP_CHAT_ID | Backend: UPDATE orders (payment_status, status, payment_confirmed_by/rejected_by), INSERT order_status_history; **возврат боту:** answerCbQuery; бот шлёт клиенту в ЛС «Оплата подтверждена» / «Оплата не прошла» и редактирует сообщение в группе (убирает кнопки) |
| **⑩** | Backend | PostgreSQL | **SELECT** products, categories (с кэшем Redis), **INSERT/UPDATE** users (по telegram_id при ⑦), **INSERT** orders, order_items, order_status_history; **SELECT** orders, order_items, order_status_history при ⑤, ⑥; **UPDATE** orders при ⑨ | Строки/результаты: users{ id, telegram_id, name, phone, bonus_balance }, products{ id, name, price, images, in_stock, category_id }, orders{ id, order_number, user_id, posiflora_order_id, total, status, payment_status, ... }, order_items{ product_name, product_price, quantity, total } и т.д. |
| **⑪** | Backend | Redis | **get** products:*, categories:* (до запроса в DB); **set** после записи в DB; **incr** для rate-limit | Значения кэша (JSON) или счётчик rate-limit |
| **⑫** | Backend | Posiflora API | **Запрос клиента по phone** (getClient(phone) или аналог). Поля: phone. Если в users есть phone из TG — сразу; иначе после ①⑦: customer_phone, customer_name | client_id, name (для сопоставления users ↔ Posiflora) |
| **⑬** | Backend | Posiflora API | **Бонусы:** getBonusBalance(phone) или расчёт по заказам (категории, ФИО). Поля: phone, name; суммы заказов по категориям | balance. Backend пишет в users.bonus_balance, bonus_history |
| **⑭** | Backend | Posiflora API | **createOrder** (после ⑦). **Тело:** { items: [{ name, price, quantity }], delivery: { type, address, date, time }, recipient: { name, phone }, source: "telegram_mini_app" } | posiflora_order_id. Backend сохраняет в orders.posiflora_order_id |
| **⑮** | Backend | Posiflora API | **GET** /catalog/categories, /catalog/{id} | **Получает:** name, price, images, description, in_stock, category. Backend пишет в **products**, **categories** (⑩) |
| **⑯** | Backend | Супергруппа | **sendMessage** (ожидание оплаты по ⑦), **sendPhoto** (чек по ⑧). **Поля в сообщении:** order_number, customer_name, customer_phone, total, items; кнопки callback: payment_confirm:N, payment_reject:N | Сообщение/фото в группе; ответ при нажатии кнопки приходит как ⑨ |
| **⑰** | Backend | Супергруппа | **Создание/поиск треда** по user_id (support_threads.supergroup_topic_id). При нажатии «Поддержка» в Profile: найти или создать тред | Один тред на клиента; общение клиента — в боте, не в группе |

---

### Краткая структура таблиц PostgreSQL (для ⑩)

| № | Откуда | Куда | Запрос / Действие (что шлём) | Ответ / Результат (что получаем) |
|---|--------|------|------------------------------|----------------------------------|
| **1** | Backend | PostgreSQL | **SELECT/INSERT/UPDATE** users. Поля: id, telegram_id, telegram_username, name, phone, email, bonus_balance | Строки users (при ⑦ — по telegram_id; при ⑫,⑬ — по phone) |
| **2** | Backend | PostgreSQL | **SELECT** products (с кэшем Redis). Поля: id, posiflora_id, name, price, old_price, images, in_stock, category_id, description | Строки products для ①, ②; **INSERT/UPDATE** после ⑮ (Posiflora sync) |
| **3** | Backend | PostgreSQL | **SELECT** categories. Поля: id, posiflora_id, name, slug | Строки categories для ③; **INSERT/UPDATE** после ⑮ |
| **4** | Backend | PostgreSQL | **INSERT** orders, **SELECT** при ⑤,⑥, **UPDATE** при ⑨. Поля: id, order_number, user_id, posiflora_order_id, customer_name, customer_phone, total, status, payment_status, delivery_type, delivery_address, recipient_name, recipient_phone, card_text | Строки orders; при ⑦ — id, order_number; при ⑨ — payment_status, status |
| **5** | Backend | PostgreSQL | **INSERT** order_items при ⑦. Поля: order_id, product_id, product_name, product_price, quantity, total | Строки order_items (состав заказа) |
| **6** | Backend | PostgreSQL | **INSERT** order_status_history при ⑦, ⑨. Поля: order_id, status, comment, changed_at | История смены статусов |
| **7** | Backend | PostgreSQL | **SELECT/INSERT/UPDATE/DELETE** carts. Поля: user_id, product_id, quantity | Строки carts (заглушки API) |
| **8** | Backend | PostgreSQL | **INSERT** bonus_history при начислении/списании. Поля: user_id, order_id, type, amount | Строки bonus_history; обновление users.bonus_balance |
| **9** | Backend | PostgreSQL | **SELECT** pickup_points. Поля: id, posiflora_id, name, address | Строки pickup_points (заглушка до Posiflora) |
| **10** | Backend | PostgreSQL | **SELECT/INSERT** support_threads. Поля: user_id, telegram_id, supergroup_topic_id | Один тред на user_id для ⑰ |

---

### PlantUML: 2. Диаграмма классов БД

```plantuml
@startuml db_classes
!theme plain
skinparam classAttributeIconSize 0

class users {
  + id : SERIAL PK
  + telegram_id : BIGINT UNIQUE NOT NULL
  + telegram_username : VARCHAR(255)
  + name : VARCHAR(255)
  + phone : VARCHAR(50)
  + email : VARCHAR(255)
  + bonus_balance : DECIMAL(10,2)
  + created_at : TIMESTAMP
  + updated_at : TIMESTAMP
}

class categories {
  + id : SERIAL PK
  + posiflora_id : VARCHAR(255) UNIQUE
  + name : VARCHAR(255) NOT NULL
  + slug : VARCHAR(255) UNIQUE
  + parent_id : FK
  + description : TEXT
  + image_url : VARCHAR(500)
  + sort_order : INT
  + is_active : BOOLEAN
  + created_at : TIMESTAMP
  + updated_at : TIMESTAMP
}

class products {
  + id : SERIAL PK
  + posiflora_id : VARCHAR(255) UNIQUE
  + name : VARCHAR(255) NOT NULL
  + description : TEXT
  + price : DECIMAL(10,2) NOT NULL
  + old_price : DECIMAL(10,2)
  + currency : VARCHAR(10)
  + category_id : FK
  + images : JSONB
  + article : VARCHAR(255)
  + sku : VARCHAR(255)
  + in_stock : BOOLEAN
  + stock_quantity : INT
  + bonus_percent : DECIMAL(5,2)
  + weight : DECIMAL(10,2)
  + attributes : JSONB
  + sort_order : INT
  + created_at : TIMESTAMP
  + updated_at : TIMESTAMP
}

class carts {
  + id : SERIAL PK
  + user_id : FK users
  + product_id : FK products
  + quantity : INT NOT NULL
  + created_at : TIMESTAMP
  + updated_at : TIMESTAMP
  __ UNIQUE(user_id, product_id)
}

class orders {
  + id : SERIAL PK
  + order_number : VARCHAR(100) UNIQUE NOT NULL
  + user_id : FK users
  + posiflora_order_id : VARCHAR(255)
  + customer_name : VARCHAR(255) NOT NULL
  + customer_phone : VARCHAR(50) NOT NULL
  + customer_email : VARCHAR(255)
  + status : VARCHAR(50)
  + status_code : INT
  + delivery_type : VARCHAR(20)
  + delivery_address : JSONB
  + pickup_point_id : FK
  + delivery_cost : DECIMAL(10,2)
  + delivery_date : DATE
  + delivery_time : TIME
  + payment_type : VARCHAR(50)
  + payment_status : VARCHAR(50)
  + bonus_used : DECIMAL(10,2)
  + bonus_accrued : DECIMAL(10,2)
  + subtotal : DECIMAL(10,2)
  + total : DECIMAL(10,2)
  + comment : TEXT
  + source : VARCHAR(50)
  + recipient_name : VARCHAR(255)
  + recipient_phone : VARCHAR(50)
  + card_text : TEXT
  + payment_confirmed_by : BIGINT
  + payment_confirmed_at : TIMESTAMP
  + payment_rejected_by : BIGINT
  + payment_rejected_at : TIMESTAMP
  + created_at : TIMESTAMP
  + updated_at : TIMESTAMP
}

class order_items {
  + id : SERIAL PK
  + order_id : FK orders
  + product_id : FK products
  + product_name : VARCHAR(255) NOT NULL
  + product_price : DECIMAL(10,2) NOT NULL
  + quantity : INT NOT NULL
  + total : DECIMAL(10,2) NOT NULL
  + product_image : VARCHAR(500)
  + created_at : TIMESTAMP
}

class order_status_history {
  + id : SERIAL PK
  + order_id : FK orders
  + status : VARCHAR(50) NOT NULL
  + status_code : INT
  + comment : TEXT
  + changed_at : TIMESTAMP
}

class bonus_history {
  + id : SERIAL PK
  + user_id : FK users
  + order_id : FK orders
  + type : VARCHAR(50)
  + amount : DECIMAL(10,2) NOT NULL
  + description : TEXT
  + created_at : TIMESTAMP
}

class pickup_points {
  + id : SERIAL PK
  + posiflora_id : VARCHAR(255) UNIQUE
  + name : VARCHAR(255) NOT NULL
  + address : JSONB NOT NULL
  + working_hours : JSONB
  + phone : VARCHAR(50)
  + description : TEXT
  + image_url : VARCHAR(500)
  + map_url : VARCHAR(500)
  + coordinates : JSONB
  + is_active : BOOLEAN
  + sort_order : INT
  + created_at : TIMESTAMP
  + updated_at : TIMESTAMP
}

class support_threads {
  + id : SERIAL PK
  + user_id : FK users
  + telegram_id : BIGINT
  + supergroup_topic_id : INT
  + created_at : TIMESTAMP
}

users --> orders : user_id
users --> carts : user_id
users --> bonus_history : user_id
users --> support_threads : user_id
categories --> products : category_id
products --> order_items : product_id
orders --> order_items : order_id
orders --> order_status_history : order_id
orders --> pickup_points : pickup_point_id

@enduml
```

---

### PlantUML: 3. Последовательность — создание заказа

```plantuml
@startuml order_sequence
!theme plain

actor Клиент as U
participant "Mini App" as M
participant "Backend API" as API
database "PostgreSQL" as DB
participant "Posiflora" as PF
participant "Telegram Bot" as Bot
participant "Супергруппа" as Grp
actor "Менеджер" as Mgr

U -> M : Checkout: форма + «Оформить заказ»
M -> API : POST /api/orders (createOrderSchema, initData)
API -> DB : users: upsert по telegram_id
API -> DB : orders + order_items + order_status_history
API -> PF : (план) Заказ с составом в CRM, posiflora_order_id
API --> M : { id, order_number, total, status, payment_status }

M -> M : paymentStep=payment, реквизиты/QR, «Приложить чек»
U -> M : Загрузить чек (фото)
M -> API : POST /api/orders/:id/receipt { imageDataUrl, fileName }
API -> Bot : notifyManagerPaymentReceipt(чек, orderId)
Bot -> Grp : Фото чека + [✅ Подтвердить] [❌ Не оплачено]

Mgr -> Grp : Нажимает [✅] или [❌]
Grp -> Bot : callback_query payment_confirm:N | payment_reject:N
Bot -> API : callback.handler
API -> DB : UPDATE orders (payment_status, status)\norder_status_history
Bot -> U : ЛС: «Оплата подтверждена» / «Оплата не прошла»
Bot -> Grp : Редактирование: убрать кнопки, дописать результат

@enduml
```

---

### PlantUML: 4. Активность — интеграция Posiflora

```plantuml
@startuml posiflora_activity
!theme plain

|Posiflora|
start
:База клиентов;
:Бонусы: сумма заказов, категории, телефон, ФИО;
:CRM: заказы с полным составом;

|Сопоставление|
:Сопоставление по телефону;
if (Телефон есть в профиле TG?) then (да)
  :Сразу использовать профиль Posiflora;
else (нет)
  :После первого заказа: customer_phone + customer_name;
  :Обновить users;
endif

|Бонусы|
:orders → расчёт по категориям, телефон, ФИО;
:Posiflora: полное сопоставление;
:users.bonus_balance, bonus_history;

|Заказ в CRM|
:orders + order_items;
:Отправить в Posiflora: состав, доставка, получатель, source=telegram_mini_app;
:Сохранить posiflora_order_id в orders;
stop

@enduml
```

---

### PlantUML: 5. Активность — синхронизация Posiflora

```plantuml
@startuml posiflora_sync_activity
!theme plain

|Posiflora API|
start
:Карточка товара: изображения, название, цена, состав, описание, в наличии, категория;
:Список товаров / категории;

|Posiflora sync (cron)|
:scrapeCatalog();
:parseCategoryPage / parseProductPage;
:fetchSitemapUrls (если нет товаров);

|Posiflora catalog sync|
:upsertCategories → categories;
:upsertProducts → products (posiflora_id=url);
:cache.clearPattern products:*, categories:*;

|Mini App|
:Catalog — витрина;
:Product — карточка;
stop

@enduml
```

---

### PlantUML: 6. Активность — поддержка и супергруппа

```plantuml
@startuml support_activity
!theme plain

|Профиль — вкладка Поддержка|
start
:Кнопка «Написать в поддержку»;

|По нажатию|
:Найти или создать тред в супергруппе по user_id/telegram_id;
note right: support_threads(user_id, supergroup_topic_id)
:Один чат на клиента — при повторных тот же тред;
:Переход в бота для общения;
note right: Общение клиента только в боте

|Супергруппа|
fork
  :Треды с клиентами: 1 топик на клиента;
fork again
  :Общий чат заказов: notifyManagerPaymentRequest, notifyManagerPaymentReceipt;
  :Кнопки [✅ Подтвердить] [❌ Не оплачено];
  :callback payment_confirm:N / payment_reject:N;
end fork
stop

@enduml
```

---

### PlantUML: 7. Диаграмма развёртывания (упрощённая)

```plantuml
@startuml deployment
!theme plain

node "Telegram" {
  artifact "Telegram Bot (Telegraf)"
  artifact "Mini App (React, WebView)"
  artifact "Супергруппа"
}

node "Сервер" {
  artifact "Backend (Node.js, Express)"
  database "PostgreSQL"
  database "Redis"
}

cloud "Внешние" {
  artifact "Posiflora API"
}

"Telegram Bot" ..> "Backend" : HTTPS / Webhook
"Mini App" ..> "Backend" : HTTPS, initData
"Backend" ..> "PostgreSQL" : SQL
"Backend" ..> "Redis" : кэш, rate-limit
"Backend" ..> "Posiflora API" : REST
"Backend" ..> "Супергруппа" : sendMessage, sendPhoto

@enduml
```

---

### PlantUML: 8. Бот — команды и обработчики

```plantuml
@startuml bot_handlers
!theme plain

package "Команды / События" {
  [ /start ] as cmd_start
  [ /menu ] as cmd_menu
  [ текст: СТАРТ, Мои заказы, О нас, Помощь ] as cmd_msg
  [ callback_query ] as cmd_cb
  [ WebApp data ] as cmd_web
}

package "Обработчики" {
  [ start.ts ] as h_start
  [ menu.ts ] as h_menu
  [ message.handler ] as h_msg
  [ callback.handler: payment_confirm/reject ] as h_cb
  [ webapp.handler ] as h_web
}

package "Уведомления" {
  [ notifyManagerPaymentRequest ] as n_req
  [ notifyManagerPaymentReceipt: чек + кнопки ] as n_rcpt
  [ notifyOrderStatusUpdate: в ЛС ] as n_status
}

cmd_start --> h_start
cmd_menu --> h_menu
cmd_msg --> h_msg
cmd_cb --> h_cb
cmd_web --> h_web

[ orders.create ] ..> n_req
[ orders.uploadReceipt ] ..> n_rcpt
h_cb ..> [ UPDATE orders, order_status_history ]
h_cb ..> n_status

@enduml
```

---

## Бесплатные сервисы: вставить код → получить диаграмму со связями

Ниже — инструменты, где можно вставить текстовый/код и получить изображение диаграммы с простроенными связями. Все перечисленные варианты можно использовать бесплатно.

---

### 1. Mermaid Live Editor  
**https://mermaid.live**

| Параметр | Значение |
|----------|----------|
| **Язык** | Mermaid (flowchart, sequenceDiagram, classDiagram, stateDiagram и др.) |
| **Как** | Вставить код в левую панель → справа диаграмма, экспорт PNG/SVG |
| **Связи** | `-->`, `->`, `---`, `==>`, подписи на рёбрах: `A -->\|"текст"\| B` |
| **Плюсы** | Уже есть в этом документе; рендер в GitHub, GitLab, Notion, Obsidian |

**Пример (flowchart):**
```mermaid
flowchart LR
  A[Mini App] -->|GET /api/products| B[Backend]
  B -->|SELECT| C[(PostgreSQL)]
```

---

### 2. Kroki  
**https://kroki.io** (или **https://kroki.io/demo**)

| Параметр | Значение |
|----------|----------|
| **Языки** | PlantUML, Mermaid, GraphViz (DOT), D2, BlockDiag, BPMN, Excalidraw JSON и др. |
| **Как** | Выбрать движок (например, PlantUML) → вставить код → получить картинку. Есть REST API (GET/POST) для встраивания в приложения. |
| **Связи** | Зависят от выбранного формата (PlantUML, Mermaid и т.д.) |
| **Плюсы** | Один сервис для многих форматов; можно поднять свой instance. |

---

### 3. Draw.io (diagrams.net)  
**https://app.diagrams.net** или **https://draw.io**

| Параметр | Значение |
|----------|----------|
| **Язык** | В основном ручное рисование, но есть вставка **PlantUML** |
| **Как** | `Арrange` → `Insert` → `Advanced` → `PlantUML…` → вставить код PlantUML → сгенерируется диаграмма. Экспорт: PNG, SVG, PDF. |
| **Связи** | Строятся по коду PlantUML (компоненты, стрелки, подписи). Дальше можно двигать блоки вручную. |
| **Плюсы** | Бесплатно, без регистрации; можно хранить в Google Drive, OneDrive, на диске. |

---

### 4. PlantUML Server  
**https://www.plantuml.com/plantuml/uml**

| Параметр | Значение |
|----------|----------|
| **Язык** | PlantUML (компоненты, классы, последовательности, активности, развёртывание и др.) |
| **Как** | Вставить код между `@startuml` и `@enduml` → `Submit` → PNG/SVG. |
| **Связи** | `-->`, `->`, `-down->`, `..>`, `note`, подписи на стрелках. |
| **Плюсы** | Официальный демо-сервер; полная поддержка синтаксиса PlantUML. |

---

### 5. Graphviz (DOT)  
**https://edotor.net** или **https://viz-js.com**

| Параметр | Значение |
|----------|----------|
| **Язык** | DOT (Graphviz) |
| **Как** | Вставить код `digraph { ... }` → нажать `Run` / `Submit` → граф со связями. |
| **Связи** | `A -> B`, `A -> B [label="текст"]`, `{A B} -> C` и т.п. |
| **Плюсы** | Удобно для иерархий, графов, графов зависимостей. |

**Пример:**
```
digraph G {
  MiniApp -> Backend [label="GET /api/products"]
  Backend -> DB [label="SELECT"]
}
```

---

### 6. D2 (D2 lang)  
**https://play.d2lang.com** или CLI: `d2 diagram.d2 diagram.png`

| Параметр | Значение |
|----------|----------|
| **Язык** | D2 |
| **Как** | Вставить код в Playground → превью, экспорт PNG/SVG. |
| **Связи** | `a -> b`, `a -> b: "подпись"`, вложенность, стили. |
| **Плюсы** | Читаемый текст, приятные макеты по умолчанию. |

**Пример:**
```
a: Mini App -> b: Backend { shape: rectangle }
b -> c: PostgreSQL
```

---

### 7. Structurizr Lite (C4)  
**https://structurizr.com** (онлайн) или **Structurizr Lite** (локально, Docker)

| Параметр | Значение |
|----------|----------|
| **Язык** | C4 (DSL: workspace, model, views — System Context, Container, Component) |
| **Как** | Онлайн: создать workspace, ввести DSL. Локально: `docker run -p 8080:8080 structurizr/lite` и открыть `http://localhost:8080`. |
| **Связи** | `Person -> System`, `Container -> Container` и т.д. |
| **Плюсы** | Заточен под архитектуру (системы, контейнеры, компоненты); бесплатный тариф. |

---

### 8. nomnoml  
**https://nomnoml.com**

| Параметр | Значение |
|----------|----------|
| **Язык** | Упрощённый UML-подобный текст |
| **Как** | Вставить код → диаграмма, экспорт PNG. |
| **Связи** | `[A] -> [B]`, `[A] -:> [B]` (наследование) и др. |
| **Плюсы** | Минимум синтаксиса, быстро набросать классы/связи. |

---

### 9. VS Code (расширения)

| Расширение | Язык | Действие |
|------------|------|----------|
| **PlantUML** (jebbs.plantuml) | PlantUML | Открыть `.puml` или блок в `.md` → `Alt+D` (preview), экспорт PNG/SVG. |
| **Mermaid** (bpruitt-goddard.mermaid-markdown-syntax-highlighting) или встроенная поддержка | Mermaid | Превью Mermaid в Markdown. |
| **Markdown Preview Mermaid Support** | Mermaid | Рендер Mermaid в Markdown Preview. |

Все расширения бесплатны. Код — в репозитории, диаграммы в превью и экспорте.

---

### 10. Где ещё рендерится без отдельного сервиса

| Место | Что умеет |
|-------|-----------|
| **GitHub / GitLab** | Mermaid в `.md` — рендер в превью. PlantUML — через Kroki-интеграцию (если включено) или вручную. |
| **Notion** | Блок `/mermaid` — вставить код Mermaid. |
| **Obsidian** | Mermaid в note; для PlantUML — плагин (например, «PlantUML»). |
| **HackMD / CodiMD** | Mermaid, при наличии — PlantUML. |

---

### Что выбрать под нашу схему

- **Компоненты, последовательности, классы БД, активности** (как в этом документе) → **PlantUML** (plantuml.com, Kroki, Draw.io) или **Mermaid** (mermaid.live, Kroki).
- **Графы, дерево зависимостей** → **Graphviz** (edotor.net, viz-js.com).
- **Архитектура C4 (системы, контейнеры)** → **Structurizr**.
- **Быстрый набросок в браузере** → **Mermaid Live** или **nomnoml**.
- **Редактировать в IDE и экспортировать** → **VS Code + PlantUML / Mermaid**.

Для блоков из раздела «PlantUML» в этом файле подойдут: **plantuml.com**, **Kroki** (движок PlantUML) или **Draw.io** (Insert → Advanced → PlantUML). Для блоков **Mermaid** — **mermaid.live** или **Kroki** (движок Mermaid).

---

*Документ можно дополнять при появлении новых интеграций (детальные контракты Posiflora, реализации чатов поддержки в супергруппе).*
