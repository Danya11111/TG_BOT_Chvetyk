# 🚀 Инструкции по развертыванию

## Production развертывание

### 1. Подготовка сервера

**Требования:**
- Docker и Docker Compose
- Доменное имя с SSL сертификатом (для Mini App)
- Доступ к Telegram Bot API

### 2. Настройка переменных окружения

Создайте файл `.env` на сервере:

```env
# Environment
NODE_ENV=production

# Backend
BACKEND_PORT=3000
API_URL=https://api.yourdomain.com

# Frontend
FRONTEND_PORT=5173
WEBAPP_URL=https://yourdomain.com

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=chvetyk
DB_PASSWORD=secure_password_here
DB_NAME=chvetyk_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_production_bot_token

# Posiflora API
POSIFLORA_API_URL=https://api.posiflora.ru
POSIFLORA_API_KEY=your_posiflora_api_key

# Manager notifications
MANAGER_TELEGRAM_IDS=123456789,987654321
```

### 3. Настройка Nginx (опционально, для production)

Создайте конфигурацию Nginx для проксирования:

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend Mini App
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL сертификат (Let's Encrypt)

```bash
# Установка Certbot
sudo apt-get install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

### 5. Запуск на production

```bash
# Клонирование репозитория
git clone <repository-url>
cd TG_BOT_Chvetyk

# Создание .env файла
cp .env.example .env
# Отредактируйте .env с production значениями

# Запуск через Docker Compose
docker-compose -f docker-compose.yml up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

### 6. Выполнение миграций БД

```bash
# Через Docker
docker-compose exec backend npm run migrate

# Или напрямую через psql
docker-compose exec postgres psql -U chvetyk -d chvetyk_db -f /app/src/database/migrations/001_initial_schema.sql
```

### 7. Настройка Telegram Bot

1. Откройте [@BotFather](https://t.me/BotFather)
2. Выберите вашего бота
3. Выполните команду `/setmenubutton`
4. Укажите URL вашего Mini App: `https://yourdomain.com`
5. Укажите текст кнопки: `🌺 Открыть каталог`

### 8. Мониторинг и логирование

```bash
# Просмотр логов всех сервисов
docker-compose logs -f

# Просмотр логов только backend
docker-compose logs -f backend

# Просмотр логов только frontend
docker-compose logs -f frontend

# Ротация логов (настройте в docker-compose.yml или через logrotate)
```

### 9. Обновление приложения

```bash
# Получение последних изменений
git pull origin main

# Пересборка и перезапуск
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Применение миграций (если есть новые)
docker-compose exec backend npm run migrate
```

### 10. Резервное копирование базы данных

```bash
# Создание бэкапа
docker-compose exec postgres pg_dump -U chvetyk chvetyk_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
docker-compose exec -T postgres psql -U chvetyk chvetyk_db < backup_20240110_120000.sql
```

## Обновление после получения данных от Posiflora

После получения данных от Posiflora выполните следующие шаги:

1. **Обновите переменные окружения:**
   ```bash
   # Добавьте в .env
   POSIFLORA_API_URL=https://api.posiflora.ru
   POSIFLORA_API_KEY=your_api_key
   ```

2. **Перезапустите сервисы:**
   ```bash
   docker-compose restart backend
   ```

3. **Проверьте интеграцию:**
   ```bash
   # Проверка API
   curl http://localhost:3000/api/products
   
   # Проверка логов
   docker-compose logs -f backend
   ```

## Troubleshooting

### Проблема: Бот не отвечает

```bash
# Проверьте токен бота
docker-compose logs backend | grep -i "bot\|telegram"

# Проверьте переменные окружения
docker-compose exec backend env | grep TELEGRAM
```

### Проблема: Mini App не открывается

1. Проверьте WEBAPP_URL в .env
2. Убедитесь, что URL доступен извне (не localhost)
3. Проверьте настройки бота в BotFather
4. Проверьте логи frontend: `docker-compose logs frontend`

### Проблема: База данных недоступна

```bash
# Проверьте статус PostgreSQL
docker-compose ps postgres

# Проверьте подключение
docker-compose exec postgres psql -U chvetyk -d chvetyk_db -c "SELECT 1;"

# Проверьте логи
docker-compose logs postgres
```

### Проблема: Redis недоступен

```bash
# Проверьте статус Redis
docker-compose ps redis

# Проверьте подключение
docker-compose exec redis redis-cli ping

# Проверьте логи
docker-compose logs redis
```
