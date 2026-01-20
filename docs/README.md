# Telegram Mini App (Chvetyk)

Проект: Telegram Bot + Mini App для витрины/заказов цветов с последующей интеграцией с Posiflora.

Состав:
- Backend (Node.js, Express, Telegraf) — API, бот, интеграции, валидация данных.
- Frontend (Vite, React, Zustand, TWA SDK) — Mini App UI без бизнес-логики.

Быстрый обзор:
- Разделение ответственности: UI ↔ store/services ↔ API.
- Единый формат успешных ответов и централизованный error handling на бэкенде.
- Общий логер, кеш (Redis), БД (PostgreSQL), подготовка к Posiflora.
- Типизированные сущности и пагинация, отсутствие вызовов API из UI.

Детали и схемы см. в `/docs/architecture.md`, фронт — `/docs/frontend.md`, бэк — `/docs/backend.md`, авторизация/initData — `/docs/auth.md`.
