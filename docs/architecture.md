# Архитектура

## Общая схема
- Telegram Mini App (WebView, React, @twa-dev/sdk)
  → Backend API (Express)
  → External APIs: **Floria** (товары), **Posiflora** (клиенты и бонусы, заказ только заголовок)
- Telegram Bot (Telegraf) работает отдельно, но в том же бэкенд-процессе.

## Separation of Concerns
- Frontend: `pages` (маршруты/контейнеры), `components` (UI), `store` (Zustand состояние), `services` (API-вызовы), `utils`, `types`, `config`.
- Backend: `api` (routes/controllers/middlewares), `services` (доменные операции), `utils` (валидация, ошибки, логирование), `database` (PostgreSQL/Redis), `config`.
- В UI нет прямых API-вызовов и бизнес-логики; запросы идут через services + stores.

## Поток данных
1) Пользователь открывает Mini App в Telegram WebView.
2) Frontend получает `initData` из TWA SDK, работает через React + Zustand, дергает backend через `/api/*`.
3) Backend обрабатывает запросы через маршруты → контроллеры → сервисы:
   - Валидация и нормализация входных данных.
   - Единый формат успешных ответов (success-response).
   - Централизованный error-handler.
4) Интеграции с внешними системами:
   - **Floria API** — единственный источник товаров (каталог, резолв при создании заказа). Конфиг: `config.floria`, клиент в `integrations/floria`.
   - **Posiflora API** — база клиентов (поиск/создание по телефону, posiflora_customer_id), бонусная система (setCustomerPoints, getCustomerById), создание заказа **без позиций** (только заголовок: клиент, доставка, сумма, byBonuses). Синхронизация каталога из Posiflora отключена.

## Ключевые элементы
- Логи: общий winston-logger (консоль + файлы), уровень зависит от `NODE_ENV`. Автоматическая фильтрация чувствительных данных.
- Кэш: Redis (см. `database/redis.ts`), TTL вынесен в `utils/constants.ts`.
- Пагинация: типизирована через `types/pagination.ts`.
- Бот: Telegraf, команды/handlers вынесены отдельно, graceful shutdown.
- Безопасность: валидация файлов, фильтрация логов, HTTPS редирект, валидация на уровне БД.
- Health Check: проверка состояния БД и Redis через `/health` эндпойнт.
