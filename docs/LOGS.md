# Просмотр логов

> **Примечание:** В этой документации используется `docker compose` (без дефиса) - это новая версия Docker Compose, встроенная в Docker CLI. Если у вас установлена старая версия `docker-compose` (с дефисом), замените все команды `docker compose` на `docker-compose`.

## Быстрый старт

### Просмотр логов Docker контейнеров

```bash
# Все сервисы (последние 100 строк)
docker compose logs --tail=100

# Только backend (в реальном времени)
docker compose logs -f backend

# Только backend (последние 200 строк)
docker compose logs --tail=200 backend

# Все сервисы в реальном времени
docker compose logs -f

# Логи с временными метками
docker compose logs -t backend
```

### Просмотр логов внутри контейнера

```bash
# Войти в контейнер backend
docker compose exec backend sh

# Посмотреть логи приложения
cat logs/combined.log | tail -100
cat logs/error.log | tail -50

# Поиск по логам
grep "payment_confirm" logs/combined.log
grep "ERROR" logs/error.log
grep "Failed to" logs/combined.log
```

### Просмотр логов через Docker напрямую

```bash
# Логи контейнера backend
docker logs chvetyk_backend --tail=100 -f

# Логи с временными метками
docker logs chvetyk_backend -t --tail=200

# Логи за последний час
docker logs chvetyk_backend --since 1h
```

## Поиск конкретных проблем

### Проблемы с callback (кнопки подтверждения оплаты)

```bash
# Ищем все callback запросы
docker compose logs backend | grep -i "callback"

# Ищем ошибки при обработке callback
docker compose logs backend | grep -i "payment.*callback\|Failed to handle payment"

# Ищем конкретный заказ
docker compose logs backend | grep "order.*123"  # замените 123 на ID заказа
```

### Проблемы с отправкой чеков

```bash
# Ищем отправку чеков
docker compose logs backend | grep -i "receipt\|sendPhoto"

# Ищем ошибки при отправке
docker compose logs backend | grep -i "Failed to send.*receipt\|Failed to send.*photo"
```

### Проблемы с API

```bash
# Все ошибки API
docker compose logs backend | grep -i "error\|ERROR"

# Ошибки 500
docker compose logs backend | grep -i "500\|Internal Server Error"

# Ошибки валидации
docker compose logs backend | grep -i "ValidationError\|validation"
```

## Просмотр файлов логов приложения

Логи приложения сохраняются в файлы внутри контейнера:
- `logs/combined.log` - все логи
- `logs/error.log` - только ошибки

### Копирование логов на хост

```bash
# Копировать логи на хост
docker cp chvetyk_backend:/app/logs ./logs_backup

# Или через docker compose
docker compose exec backend cat logs/combined.log > local_combined.log
docker compose exec backend cat logs/error.log > local_error.log
```

### Просмотр логов в реальном времени

```bash
# Следить за логами в реальном времени
docker compose exec backend tail -f logs/combined.log

# Следить только за ошибками
docker compose exec backend tail -f logs/error.log
```

## Полезные команды для отладки

### Проверка статуса контейнеров

```bash
# Статус всех контейнеров
docker compose ps

# Проверка здоровья backend
docker compose exec backend node -e "require('http').get('http://localhost:3000/health', (r) => {let data='';r.on('data',d=>data+=d);r.on('end',()=>console.log(data))})"
```

### Проверка подключений

```bash
# Проверка подключения к БД
docker compose exec backend node -e "const {db} = require('./dist/database/connection'); db.query('SELECT NOW()').then(r => console.log('DB OK:', r.rows[0])).catch(e => console.error('DB ERROR:', e))"

# Проверка Redis
docker compose exec backend node -e "const redis = require('redis'); const client = redis.createClient({url: 'redis://redis:6379'}); client.connect().then(() => client.ping().then(r => console.log('Redis OK:', r)))"
```

### Поиск проблем с Telegram Bot

```bash
# Логи бота
docker compose logs backend | grep -i "bot\|telegram"

# Ошибки бота
docker compose logs backend | grep -i "Bot error\|telegram.*error"

# Callback запросы
docker compose logs backend | grep -i "Received callback\|Processing payment callback"
```

## Фильтрация логов

### По времени

```bash
# Логи за последние 10 минут
docker logs chvetyk_backend --since 10m

# Логи за последний час
docker logs chvetyk_backend --since 1h

# Логи с определенного времени
docker logs chvetyk_backend --since "2026-01-21T17:00:00"
```

### По уровню важности

```bash
# Только ошибки
docker compose logs backend | grep -i "error\|ERROR"

# Только предупреждения и ошибки
docker compose logs backend | grep -i "warn\|error\|WARN\|ERROR"

# Только информационные сообщения
docker compose logs backend | grep -i "info\|INFO" | grep -v "error\|ERROR"
```

## Экспорт логов

```bash
# Сохранить все логи в файл
docker compose logs --no-color > all_logs.txt

# Сохранить логи backend
docker compose logs backend --no-color > backend_logs.txt

# Сохранить логи с временными метками
docker compose logs -t backend --no-color > backend_logs_timestamped.txt
```

## Мониторинг в реальном времени

```bash
# Следить за логами всех сервисов
docker compose logs -f

# Следить только за backend и фильтровать по ключевым словам
docker compose logs -f backend | grep --line-buffered -i "error\|callback\|receipt\|payment"

# Следить за логами и сохранять в файл одновременно
docker compose logs -f backend | tee backend_live.log
```

## Важные моменты

1. **Логи в production**: В production логи пишутся только в файлы (`logs/combined.log`, `logs/error.log`), консольный вывод отключен
2. **Размер логов**: Файлы логов могут расти, периодически их нужно ротировать
3. **Чувствительные данные**: Пароли, токены и initData автоматически скрываются в логах (`***REDACTED***`)
4. **Уровень логирования**: В production используется уровень `info`, в development - `debug`

## Быстрая диагностика проблем

```bash
# 1. Проверить, что контейнеры запущены
docker compose ps

# 2. Проверить последние ошибки
docker compose logs backend --tail=50 | grep -i error

# 3. Проверить callback запросы (кнопки подтверждения оплаты)
docker compose logs backend --tail=200 | grep -i "callback\|payment.*confirm\|payment.*reject"

# 4. Проверить отправку чеков
docker compose logs backend --tail=100 | grep -i "receipt\|sendPhoto\|Sending receipt"

# 5. Проверить подключения
docker compose exec backend node -e "require('http').get('http://localhost:3000/health', (r) => {let data='';r.on('data',d=>data+=d);r.on('end',()=>console.log(data))})"

# 6. Проверить проблемы с базой данных
docker compose logs postgres | grep -i "FATAL\|error"

# 7. Проверить проблемы с Telegram Bot (409 Conflict = несколько экземпляров)
docker compose logs backend | grep -i "409\|Conflict\|getUpdates"

# 8. Смотреть логи в реальном времени с фильтрацией по callback
docker compose logs -f backend | grep --line-buffered -i "callback\|payment\|receipt"
```

## Решение частых проблем

### Проблема: database "chvetyk" does not exist

**Причина:** Неправильное имя базы данных в переменных окружения. Приложение пытается подключиться к `chvetyk`, но база данных называется `chvetyk_db`.

**Решение:**
```bash
# 1. Проверить переменные окружения в контейнере
docker compose exec backend env | grep DB_NAME

# 2. Проверить файл env.txt на сервере
cat env.txt | grep DB_NAME

# 3. Если в env.txt указано DB_NAME=chvetyk, исправить на:
# DB_NAME=chvetyk_db
nano env.txt  # или vi env.txt

# 4. Проверить какие базы данных существуют
docker compose exec postgres psql -U chvetyk -l

# 5. Если база chvetyk_db не существует, но есть chvetyk, можно:
# Вариант А: Переименовать существующую базу (если там есть данные)
docker compose exec postgres psql -U chvetyk -c "ALTER DATABASE chvetyk RENAME TO chvetyk_db;"

# Вариант Б: Создать новую базу chvetyk_db (если chvetyk пустая)
docker compose exec postgres psql -U chvetyk -c "CREATE DATABASE chvetyk_db;"

# Вариант В: Удалить старую базу и пересоздать контейнеры (если данных нет)
docker compose down -v  # ВНИМАНИЕ: удалит все данные!
docker compose up -d

# 6. После исправления env.txt перезапустить контейнеры
docker compose down
docker compose up -d

# 7. Проверить логи подключения
docker compose logs backend | grep -i "Database connection config\|database.*does not exist"

# 8. Проверить что подключение работает
docker compose exec backend node -e "const {testConnection} = require('./dist/database/connection'); testConnection().then(r => console.log('Connection:', r ? 'OK' : 'FAILED'))"
```

### Проблема: 409 Conflict - terminated by other getUpdates request

**Причина:** Запущено несколько экземпляров бота одновременно.

**Решение:**
```bash
# 1. Остановить все контейнеры
docker compose down

# 2. Проверить что нет других процессов бота
ps aux | grep node | grep bot

# 3. Запустить заново
docker compose up -d

# 4. Проверить что бот запустился
docker compose logs backend | grep -i "Bot initialized\|Telegram Bot"
```

### Проблема: Кнопки подтверждения не работают

**Диагностика:**
```bash
# 1. Проверить что callback handler получает запросы
docker compose logs backend | grep -i "Received callback\|Processing payment callback"

# 2. Проверить ошибки при обработке callback
docker compose logs backend | grep -i "Failed to handle payment\|callback.*error"

# 3. Проверить что заказ обновляется
docker compose exec backend node -e "const {db} = require('./dist/database/connection'); db.query('SELECT id, payment_status FROM orders ORDER BY id DESC LIMIT 5').then(r => console.log(JSON.stringify(r.rows, null, 2)))"

# 4. Проверить логи в реальном времени при нажатии кнопки
docker compose logs -f backend | grep --line-buffered -i "callback\|payment"
```
