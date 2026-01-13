# Авторизация и initData (Telegram WebApp)

## Что такое initData
- Telegram WebApp передаёт строку `initData`, содержащую данные пользователя и подпись `hash`.
- Доверять содержимому можно только после проверки подписи.

## Как работает проверка
В `backend/src/utils/telegram-validator.ts`:
- `validateTelegramWebAppData(initData, botToken)` — проверяет подпись:
  - Парсит `initData` → отделяет `hash`.
  - Строит `data_check_string` из отсортированных параметров.
  - Генерирует секретный ключ HMAC (`WebAppData` + `botToken`).
  - Сравнивает рассчитанный `hash` с переданным.
  - Логирует невалидные случаи, возвращает `true/false`.
- `parseTelegramWebAppData(initData)` — достаёт `user`, `auth_date`, `hash`.
- `isTelegramDataFresh(authDate)` — проверяет, что данные не старше 24ч.

## Где применять
- Любые защищённые эндпойнты, которые принимают `initData` или сведения о пользователе из Mini App, должны:
  1) Проверить подпись: `validateTelegramWebAppData(initData, TELEGRAM_BOT_TOKEN)`.
  2) Проверить свежесть: `isTelegramDataFresh(auth_date)`.
  3) Парсить пользователя через `parseTelegramWebAppData` и сопоставлять с БД.
- Рекомендуется инкапсулировать это в middleware/guard на уровне маршрутов, чтобы проверка была единообразной.

## Почему важно
- Без проверки подписи злоумышленник может подделать `user`/`auth_date` и выдавать себя за другого.
- Свежесть защищает от повторного использования устаревших токенов (`replay attacks`).

## Пример потока (рекомендуемый)
1) Frontend получает `initData` из `window.Telegram.WebApp.initData`.
2) При первом защищённом запросе отправляет `initData` в заголовке/теле.
3) Backend middleware:
   - `validateTelegramWebAppData(initData, botToken)`
   - `isTelegramDataFresh(auth_date)`
   - извлекает `user.id` и сопоставляет с хранилищем.
4) Дальнейшая логика работает с подтверждённым `telegram_id`.
