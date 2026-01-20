# Backend

Технологии: Node.js, Express, Telegraf, PostgreSQL, Redis, TypeScript, winston.

## Структура
- `src/api` — маршруты, контроллеры, middleware.
- `src/services` — доменная логика и интеграции (Posiflora — будущая интеграция).
- `src/utils` — ошибки, логирование, валидация Telegram initData, константы.
- `src/database` — подключение Postgres/Redis, миграции/seed.
- `src/bot` — Telegram Bot (команды, хендлеры, нотификации).
- `src/config` — конфигурация из окружения.

## Контроллеры и маршруты
- Каждая сущность имеет контроллер (`api/controllers/*`) и маршруты (`api/routes/*`).
- Контроллеры возвращают единый success-формат через `buildSuccessResponse`.
- Асинхронные обработчики обёрнуты в `asyncHandler` для проброса ошибок в глобальный error-handler.

## Middleware
- `request-logger` — debug-лог запросов.
- `error-handler` — нормализация ошибок через `handleError`, возврат `{ success: false, error: { message } }`.
- `not-found-handler` — 404 JSON.

## Ошибки
- Базовые классы `AppError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`.
- `handleError` переводит неизвестные ошибки в 500.

## Success-response
- `buildSuccessResponse<T>(payload, { message, pagination })` → `{ success: true, data, message, pagination }`.

## Логирование
- Winston: JSON-файлы (`logs/combined.log`, `logs/error.log`), в dev — цветной console transport.
- Уровень зависит от `NODE_ENV`.

## Бот
- Telegraf инициализируется один раз, команды/handlers вынесены, graceful shutdown (SIGINT/SIGTERM).
