# Команды для развертывания на сервере

## После пуша изменений

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

Должен вернуть JSON с `database: true` и `redis: true`.

### Проверка логов
```bash
# Проверить, что чувствительные данные фильтруются
docker compose logs backend | grep -i "redacted"
```

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
