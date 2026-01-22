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
- **Безопасность:** Автоматическая фильтрация чувствительных данных (пароли, токены, initData) из логов.
- Чувствительные поля заменяются на `***REDACTED***` перед записью в лог.

## Бот
- Telegraf инициализируется один раз, команды/handlers вынесены, graceful shutdown (SIGINT/SIGTERM).

## Безопасность

### Валидация файлов
- Загрузка чеков об оплате: проверка MIME-типа через `file-type`, ограничение размера (4 МБ), ограничение количества (3 чека на заказ).
- Валидация формата изображений: только PNG, JPEG, JPG, WebP.

### База данных
- CHECK constraints для валидации данных на уровне БД (положительные суммы, количества и т.д.).
- Индексы для оптимизации запросов.
- Параметризованные запросы для защиты от SQL-инъекций.

### HTTPS
- Автоматический редирект с HTTP на HTTPS в production окружении.

### Health Check
- Эндпойнт `/health` проверяет состояние БД и Redis.
- Возвращает детальную информацию о статусе каждого сервиса.

## Миграции

Миграции находятся в `src/database/migrations/`:
- `001_initial_schema.sql` - основная схема БД
- `002_orders_payment_fields.sql` - поля для оплаты
- `003_security_improvements.sql` - улучшения безопасности (CHECK constraints, индексы)

Запуск миграций:
```bash
npm run migrate
```
