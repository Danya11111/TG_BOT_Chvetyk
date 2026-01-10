# 🚀 Быстрый старт - Telegram Bot с Mini App

## 📋 Что уже готово

✅ Структура проекта  
✅ Docker Compose конфигурация  
✅ Backend API (Node.js + TypeScript + Express)  
✅ Telegram Bot (Telegraf)  
✅ Frontend Mini App (React + TypeScript + Vite)  
✅ База данных (PostgreSQL + Redis)  
✅ Базовые маршруты API  
✅ Интеграция с Telegram WebApp  

## ⚠️ Что нужно сделать дальше

### 1. Настроить переменные окружения

Создайте файл `.env` в корне проекта (на основе `.env.example`):

```bash
cp .env.example .env
```

**Важно:** Токен Telegram Bot уже указан в `.env.example`, но убедитесь, что он актуален.

### 2. Запустить проект

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### 3. Проверить работу

- **Backend API**: http://localhost:3000/health
- **Frontend Mini App**: http://localhost:5173
- **Telegram Bot**: отправьте `/start` вашему боту (@lllllllllmbot)

### 4. Настроить базу данных (после запуска)

```bash
# Выполнить миграции через Docker
docker-compose exec backend npm run migrate

# Или вручную через psql
docker-compose exec postgres psql -U chvetyk -d chvetyk_db -f /app/src/database/migrations/001_initial_schema.sql
```

## 🔧 Что нужно настроить после получения данных от Posiflora

### 1. API интеграция Posiflora

**Файлы для изменения:**
- `backend/src/config/index.ts` - добавьте `POSIFLORA_API_URL` и `POSIFLORA_API_KEY`
- `backend/src/integrations/posiflora/` - создайте клиент для API Posiflora
- `backend/src/services/product.service.ts` - реализуйте синхронизацию товаров
- `backend/src/services/order.service.ts` - реализуйте создание заказов
- `backend/src/services/bonus.service.ts` - реализуйте работу с бонусами

**Переменные окружения:**
```env
POSIFLORA_API_URL=https://api.posiflora.ru
POSIFLORA_API_KEY=your_api_key_here
```

### 2. Каталог товаров

**Файлы для изменения:**
- `backend/src/api/routes/products.routes.ts` - реализуйте получение товаров из Posiflora
- `backend/src/api/routes/categories.routes.ts` - реализуйте получение категорий
- `frontend/src/pages/Catalog.tsx` - подключите загрузку товаров из API
- `frontend/src/pages/Product.tsx` - подключите детальную страницу товара

### 3. Корзина и заказы

**Файлы для изменения:**
- `backend/src/api/routes/cart.routes.ts` - реализуйте работу с корзиной
- `backend/src/api/routes/orders.routes.ts` - реализуйте создание заказов в Posiflora
- `frontend/src/pages/Cart.tsx` - подключите сохранение корзины
- `frontend/src/pages/Checkout.tsx` - реализуйте форму оформления заказа

### 4. Бонусы

**Файлы для изменения:**
- `backend/src/api/routes/bonus.routes.ts` - реализуйте получение баланса и расчёт бонусов
- `backend/src/integrations/posiflora/bonus.integration.ts` - создайте интеграцию с бонусной системой

### 5. Доставка и самовывоз

**Файлы для изменения:**
- `backend/src/api/routes/pickup.routes.ts` - реализуйте получение точек самовывоза и расчёт доставки
- `frontend/src/pages/Checkout.tsx` - добавьте выбор доставки/самовывоза

### 6. Уведомления

**Файлы для изменения:**
- `backend/src/bot/notifications/order.notifications.ts` - уточните форматы уведомлений
- `backend/src/bot/notifications/manager.notifications.ts` - добавьте `MANAGER_TELEGRAM_IDS` в `.env`

**Переменные окружения:**
```env
MANAGER_TELEGRAM_IDS=123456789,987654321
```

## 📝 Конфигурационные файлы для быстрых изменений

### Backend конфигурация
- `backend/src/config/index.ts` - все настройки приложения
- `.env` - переменные окружения

### Frontend конфигурация
- `frontend/src/config/api.ts` - URL API сервера
- `frontend/.env` или переменные в `vite.config.ts` - настройки окружения

### База данных
- `backend/src/database/migrations/001_initial_schema.sql` - схема БД (можно изменять)
- `backend/src/database/connection.ts` - настройки подключения

### Telegram Bot
- `backend/src/bot/commands/` - команды бота
- `backend/src/bot/handlers/` - обработчики сообщений
- `.env` - `TELEGRAM_BOT_TOKEN` и `WEBAPP_URL`

## 🐛 Отладка

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend

# Только база данных
docker-compose logs -f postgres
```

### Подключение к базе данных

```bash
# PostgreSQL
docker-compose exec postgres psql -U chvetyk -d chvetyk_db

# Redis
docker-compose exec redis redis-cli
```

### Перезапуск сервисов

```bash
# Перезапуск backend
docker-compose restart backend

# Перезапуск frontend
docker-compose restart frontend

# Перезапуск всех
docker-compose restart
```

## 📚 Полезные ссылки

- [STRUCTURE.md](STRUCTURE.md) - Детальная структура проекта
- [MATERIALS_REQUEST.md](MATERIALS_REQUEST.md) - Что запросить у заказчика
- [POSIFLORA_API_REQUIREMENTS.md](POSIFLORA_API_REQUIREMENTS.md) - Требования к Posiflora API
- [README.md](README.md) - Основная документация
