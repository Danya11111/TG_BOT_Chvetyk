# Команды для развертывания на сервере

## Как задеплоить

- **Автоматически:** пуш в ветку `main` запускает GitHub Actions (деплой + проверка).
- **Вручную:** GitHub → Actions → «Deploy to server» → «Run workflow» (без пуша).

После выполнения workflow шаг **verify** проверяет контейнеры и health backend. Если verify упал — см. [TROUBLESHOOTING-502](TROUBLESHOOTING-502.md).

### Чеклист после деплоя

1. Дождаться завершения workflow (зелёные галочки у `deploy` и `verify`).
2. Если **verify** упал — открыть [TROUBLESHOOTING-502](TROUBLESHOOTING-502.md), при необходимости выполнить «Быстрое исправление 502».
3. Вручную проверить оформление заказа по сценарию в [ORDER_FLOW](ORDER_FLOW.md).

Локальная проверка health (если есть публичный URL): из корня проекта запустить `.\scripts\verify-health.ps1` (PowerShell), предварительно задав в скрипте или через `$env:BASE_URL` адрес бэкенда (например `https://your-domain.com`).

---

## После пуша изменений (ручной деплой на сервере)

Выполните следующие команды на сервере:

```bash
# 1. Перейти в директорию проекта
cd /opt/TG_BOT_Chvetyk/TG_BOT_Chvetyk

# 2. Получить последние изменения
git pull origin main

# 3. Остановить контейнеры
docker compose down

# 4. Пересобрать образы
docker compose build

# 5. Запустить контейнеры
docker compose up -d

# 6. Применить новые миграции БД
docker compose exec backend npm run migrate

# 7. Проверить статус контейнеров
docker compose ps

# 8. Проверить логи (опционально)
docker compose logs --tail=50 backend
```

## Проверка работы

### Health Check
```bash
curl http://localhost:3000/health
```

### Проверка каталога Floria (есть ли товары)

Товары в приложении берутся **только из Floria** (таблица `floria_products_snapshot`). Чтобы убедиться, что в Floria API есть товары:

```bash
docker compose exec backend npm run floria:check
```

Скрипт выведет URL Floria API, количество товаров в выборке и первые 3 названия. Если видите «Floria products (sample): 0» — проверьте на сервере переменные `FLORIA_API_BASE_URL` и `FLORIA_API_TOKEN` в `.env` и что Floria API доступен.

Должен вернуть JSON с `database: true` и `redis: true`.

### Проверка логов
```bash
# Проверить, что чувствительные данные фильтруются
docker compose logs backend | grep -i "redacted"
```

### После деплоя (каталог из снимка Floria)
- Убедитесь, что `RUN_MIGRATIONS=true` в `.env` на сервере (или миграции выполняются в CI), чтобы при старте backend создалась таблица `floria_products_snapshot`.
- При первом старте backend загружает каталог в БД (sync Floria). В логах должны быть строки: `Floria products sync started`, `Floria products sync finished`.
- Проверка каталога: запрос к API `/api/products` должен возвращать товары из БД без вызова Floria в момент запроса.

## Если возникли проблемы

### Проблема: Контейнер не запускается
```bash
# Проверить логи
docker compose logs backend

# Проверить статус
docker compose ps
```

### Проблема: Ошибка миграций
```bash
# Проверить подключение к БД
docker compose exec backend npm run migrate

# Если нужно, применить миграцию вручную
docker compose exec postgres psql -U chvetyk -d chvetyk_db -f /app/src/database/migrations/003_security_improvements.sql
```

### Проблема: Зависимости не установлены
```bash
# Пересобрать с очисткой кэша
docker compose build --no-cache backend
docker compose up -d backend
```

## Апгрейд сервера (VDS)

При переходе на более мощный VDS (например, 2 CPU, 4 GB RAM) нужно пересчитать лимиты в `docker-compose.yml`:

- **postgres:** `deploy.resources.limits.memory`, `command` (shared_buffers, work_mem, maintenance_work_mem) — можно увеличить под доступную память.
- **redis:** `deploy.resources.limits.memory`, `command` (--maxmemory) — пропорционально увеличить.
- **backend:** `deploy.resources.limits.memory`, `reservations.memory`, `NODE_OPTIONS: "--max-old-space-size=..."` — увеличить под новый объём RAM.

Текущие значения в `docker-compose.yml` рассчитаны на сервер с 1 GB RAM.

## Важные напоминания

⚠️ **КРИТИЧНО:** Если `env.txt` был в публичном репозитории:
1. Смените токен бота через @BotFather
2. Обновите `env.txt` на сервере с новым токеном

⚠️ **Перед пересборкой:** Убедитесь, что `env.txt` существует на сервере (он не должен быть в Git, но должен быть локально на сервере).
