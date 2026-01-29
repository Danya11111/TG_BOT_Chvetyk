# Пошаговый флоу оформления заказа (TG Mini App + Posiflora)

Документ описывает полный путь заказа: от нажатия «Оформить заказ» до подтверждения оплаты менеджером, включая бонусы, телефон и синхронизацию с Posiflora.

---

## 1. Фронт: страница Checkout

### 1.1 Загрузка страницы

- При монтировании вызывается **GET /api/users/me** (через `getMe()`).
- **getMe** возвращает профиль пользователя и бонусную информацию:
  - `bonus.balance` — текущий баланс бонусов;
  - `bonus.tier` — категория (Bronze/Silver/Gold);
  - `bonus.cashbackPercent`, `bonus.maxSpendPercent`;
  - `welcomeBonusClaimed` — получен ли приветственный бонус (500 бонусов начисляются только через профиль, кнопка «Получить 500 бонусов», не автоматически при getMe или /start).
- Форма предзаполняется из `savedFormData` (checkout store) или из Telegram (`WebApp.initDataUnsafe.user.first_name`). Поле **телефон** подставляется из `me.phone`, если оно уже сохранено в профиле.

### 1.2 Расчёт итогов и бонусов

- **cartSubtotal** = сумма по корзине (цена × количество).
- **bonusBalance** = `me?.bonus?.balance ?? 0`.
- **maxBonusToUse** = min(bonusBalance, cartSubtotal × maxSpendPercent / 100), округление вниз.
- Если включён чекбокс «Использовать бонусы» (`formData.useBonuses`):
  - **bonusesApplied** = maxBonusToUse;
  - **payableTotal** = cartSubtotal − bonusesApplied.
- Итог к оплате на экране: **displayedTotal** = после создания заказа подменяется на `order.total`, иначе `payableTotal`.

### 1.3 Валидация и отправка

- Пользователь заполняет: имя, телефон, email (опц.), доставка/самовывоз, **дата и время** (см. ниже), получатель, текст на открытке, комментарий, способ оплаты, чекбокс «Использовать бонусы».
- **Дата и время доставки:**
  - По умолчанию включена галочка **«Доставка по готовности»** — дата/время не выбираются; в API уходит дата «сегодня» и время пустое (интерпретируется как «по готовности»).
  - При снятии галочки: выбор даты — только 7 вариантов (сегодня, завтра, +5 дней); выбор времени — слоты с шагом **15 минут**. Для даты «сегодня» минимальное время = текущее время + 2 часа с **округлением вверх до 15 минут**; для завтра и других дней — слоты на весь день (00:00–23:45). При смене даты на «сегодня» выбранное время автоматически подставляется на минимальный слот, если текущее время раньше.
- При нажатии «Оформить заказ» вызывается **createOrder** (см. ниже). В payload уходит в том числе **useBonuses: formData.useBonuses**.

---

## 2. Бэкенд: POST /api/orders (OrdersController.create)

### 2.1 Авторизация и входные данные

- Проверяется **req.user** (Telegram user из JWT/initData).
- Тело запроса: customer (name, phone, email), delivery, recipient, cardText, comment, paymentType, **useBonuses**, items (productId, productName, price, quantity, image).

### 2.2 Транзакция БД (BEGIN)

**Шаг A: пользователь**

- **INSERT INTO users ... ON CONFLICT (telegram_id) DO UPDATE** — создаётся/обновляется пользователь (имя, телефон, email).
- Из `RETURNING` берётся **user_id** и **bonus_balance** (актуальный баланс после upsert).

**Шаг B: товары и цены**

- По каждому **productId** из payload товары запрашиваются через **Floria API** (getProductById). Цена, название, изображения и наличие берутся **только с бэкенда из Floria** (защита от подделки с фронта).
- Валидация: товар найден, in_stock, price > 0.
- Формируются **normalizedItems** (productId = Floria id, productName, price, quantity, total, productImage). Позиции в Posiflora не передаются (товары Floria не имеют posiflora_id).

**Шаг C: бонусы и итог**

- **subtotal** = сумма `item.total` по normalizedItems.
- **loyalty** = getLoyaltyInfoByTelegramId(telegramId) — тир и maxSpendPercent.
- **maxToUse** = min(userBonusBalance, subtotal × maxSpendPercent / 100), вниз.
- **bonusUsed** = payload.useBonuses ? maxToUse : 0.
- **total** = max(0, subtotal − bonusUsed).

**Шаг D: запись заказа**

- **INSERT INTO orders** (order_number, user_id, customer_*, delivery_*, payment_*, **bonus_used**, **bonus_accrued** = 0, subtotal, total, recipient_*, card_text, …).
- **bonus_accrued** заполняется позже при подтверждении оплаты.

**Шаг E: списание бонусов (если bonusUsed > 0)**

- **UPDATE users SET bonus_balance = bonus_balance − bonusUsed** с проверкой достаточности.
- **INSERT INTO bonus_history** (user_id, order_id, type = 'used', amount = bonusUsed, description = 'ORDER_BONUS_SPEND').

**Шаг F: позиции заказа**

- **INSERT INTO order_items** по каждому normalizedItem (order_id, product_id, product_name, product_price, quantity, total, product_image).

**Шаг G: история статуса**

- **INSERT INTO order_status_history** (order_id, status = PENDING, comment = 'Ожидает подтверждения оплаты').

**Шаг H: COMMIT**

### 2.3 После коммита (вне транзакции)

- **Posiflora**: если включена интеграция и у всех товаров есть posifloraId, формируется **posifloraPayload** (в т.ч. **byBonuses: bonusUsed > 0**). В зависимости от config: dry-run или вызов **posifloraOrderService.createOrder**; при успехе в orders пишется **posiflora_order_id**.
- **Ответ клиенту**: `{ id, orderNumber, total, status, paymentStatus, createdAt, bonusUsed }`.
- **Уведомление менеджеру**: notifyManagerPaymentRequest(...) — в лог менеджеров уходит заказ с кнопками «Подтвердить» / «Отклонить» и т.д.
- **Синхронизация бонусов с Posiflora**: `syncUserBonusesToPosiflora(telegramId)` вызывается асинхронно (best-effort), чтобы баланс в Posiflora соответствовал локальному после списания.

---

## 3. Фронт: после создания заказа

- В ответе приходит **total** и **bonusUsed**.
- Сохраняются **orderId**, **orderNumber**, **orderTotal**; показывается шаг оплаты (реквизиты / СБП QR, инструкция загрузить чек).
- Пользователь может загрузить чек (**uploadReceipt**), опционально опрашивается статус заказа (**getOrderStatus**). После подтверждения менеджером можно показать экран «Спасибо» и очистить корзину.
- **Отмена заказа клиентом**: на шаге оплаты внизу кнопка **«Отменить заказ»**. При подтверждении вызывается **POST /api/orders/:id/cancel**. Бэкенд проверяет принадлежность заказа пользователю и статус (pending, payment_status = pending_confirmation), переводит заказ в cancelled, возвращает списанные бонусы (bonus_used) и вызывает **syncUserBonusesToPosiflora**. Корзина не очищается; пользователь возвращается к форме заказа.

---

## 4. Менеджер: подтверждение или отклонение оплаты

- В группе менеджеров приходит сообщение о новом заказе с кнопками **order:{orderId}:confirm** и **order:{orderId}:reject**.

### 4.1 Callback order:confirm

- Статус заказа: **payment_status** → paid, **status** → confirmed.
- **order_status_history** и **order_status_history**: запись о подтверждении.
- **Бонусы — начисление кэшбэка:**
  - Если **bonus_accrued** по заказу ещё 0:  
    bonusAccrued = floor(total × cashbackPercent / 100) по тиру из getLoyaltyInfoByTelegramId(telegramId).
  - **UPDATE users SET bonus_balance = bonus_balance + bonusAccrued**.
  - **UPDATE orders SET bonus_accrued = bonusAccrued**.
  - **INSERT INTO bonus_history** (type = 'accrued', description = 'ORDER_CASHBACK').
  - **syncUserBonusesToPosiflora(telegramId)** — асинхронно.
- Клиенту в Telegram отправляется сообщение: оплата подтверждена, состав заказа, сумма, списано бонусами (если было), начислено бонусов (если начислили).

### 4.2 Callback order:reject

- **payment_status** → not_paid, **status** → cancelled (или оставляется по текущей логике).
- Если по заказу был **bonus_used** > 0:
  - **UPDATE users SET bonus_balance = bonus_balance + bonusUsed** (возврат).
  - **INSERT INTO bonus_history** (type = 'cancelled', description = 'ORDER_BONUS_REFUND').
  - **syncUserBonusesToPosiflora(telegramId)**.
- Клиенту отправляется сообщение об отклонении оплаты и контакты менеджера при необходимости.

---

## 5. Сводка: данные и источники

| Что | Где берётся |
|-----|-------------|
| Товары для витрины | **Floria API** (GET /api/products): categoryId (0 = все, -1 = онлайн-витрина), limit, offset, searchQuery, needComposition. Категории — статичный список (id 0 и -1). Синхронизация каталога из Posiflora отключена. |
| Цены в заказе | Только из **Floria API** на бэкенде при создании заказа (резолв по productId через getProductById). |
| Баланс бонусов | **users.bonus_balance**; при getMe возвращается **welcomeBonusClaimed**; приветственный бонус (500) начисляется только через профиль (кнопка «Получить 500 бонусов», POST /api/users/me/claim-welcome-bonus с телефоном), затем syncUserBonusesToPosiflora. |
| Макс. списание бонусами | loyalty.maxSpendPercent (из customer-data / loyalty.service), min(balance, subtotal × percent / 100). |
| Телефон | Профиль: **users.phone**; в заказе — payload.customer.phone и сохраняется в users при upsert. |
| Синхронизация с Posiflora | Клиент: по телефону (поиск/создание, привязка posiflora_customer_id). Бонусы: setCustomerPoints (best-effort после списания/начисления/возврата/отмены заказа). Заказ: createOrder **без позиций** (только заголовок: клиент, доставка, сумма, byBonuses). |

---

## 6. Проверка корректности (чеклист)

1. **Товары и цены**: в каталоге отображаются товары из **Floria API**; в заказе итог считается по ценам из Floria (резолв при создании заказа).
2. **Бонусы при оформлении**: при включённом «Использовать бонусы» total = subtotal − min(balance, subtotal × maxSpendPercent / 100); в ответе createOrder приходят total и bonusUsed; в БД — bonus_used, bonus_balance уменьшен, запись в bonus_history type 'used'.
3. **Подтверждение оплаты**: confirm — bonus_accrued считается и записывается один раз, баланс увеличивается, клиенту в сообщении указано «Начислено бонусов».
4. **Отклонение оплаты**: reject — при bonus_used > 0 баланс возвращается, в bonus_history — 'cancelled'.
5. **Профиль**: телефон редактируется через PATCH /api/users/me; в getMe возвращаются бонусы и тир; после установки телефона синхронизация с Posiflora (posiflora_customer_id, points) выполняется при следующих операциях.
6. **О нас**: отображаются welcomeBonus, тиры и кэшбек из customer-data (bonuses).
7. **Приветственный бонус**: начисление только через профиль (кнопка «Получить 500 бонусов», ввод телефона, POST claim-welcome-bonus); при /start — инлайн-кнопка открытия мини-приложения на вкладку «Профиль». Без автоматического начисления при getMe или /start.
8. **Отмена заказа**: кнопка «Отменить заказ» на шаге оплаты; POST /api/orders/:id/cancel; возврат бонусов и syncUserBonusesToPosiflora.
9. **Дата и время доставки**: галочка «По готовности» (по умолчанию); при выборе конкретного времени — 7 дней, слоты по 15 мин, минимум для «сегодня» = сейчас + 2 ч с округлением вверх до 15 мин.

Эта схема даёт полный пошаговый флоу от нажатия «Оформить заказ» до корректных цен (Floria), бонусов, телефона и синхронизации с Posiflora (клиенты и бонусы; заказ в Posiflora — только заголовок).
