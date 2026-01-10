# Миграции базы данных

## Запуск миграций

### Через npm скрипт (рекомендуется)

```bash
npm run migrate
```

### Вручную через psql

```bash
psql -h localhost -U chvetyk -d chvetyk_db -f src/database/migrations/001_initial_schema.sql
```

### Через Docker

```bash
docker-compose exec postgres psql -U chvetyk -d chvetyk_db -f /app/src/database/migrations/001_initial_schema.sql
```

Или скопировать файл и выполнить:

```bash
docker cp backend/src/database/migrations/001_initial_schema.sql chvetyk_postgres:/tmp/
docker-compose exec postgres psql -U chvetyk -d chvetyk_db -f /tmp/001_initial_schema.sql
```
