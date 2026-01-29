# API Документация: Получение списка продуктов

## Эндпоинт

```
https://flowers5-serv.uplinkweb.ru/5042/api/products
```

## HTTP метод

```
GET
```

## Параметры запроса

| Параметр | Тип | Обязательный | Описание | Пример |
|----------|-----|--------------|---------|--------|
| `categoryId` | integer | нет | ID категории для фильтрации. `0` = все категории, `-1` = онлайн-витрина | `0`, `10`, `-1` |
| `searchQuery` | string | нет | Поиск по названию (pagetitle), ID продукта или артикулу (article) | `"роза"`, `"123"` |
| `productId` | integer | нет | ID конкретного продукта (если указано, вернёт только этот товар) | `183` |
| `ids` | array[integer] | нет | Массив ID продуктов для фильтрации | `[123, 456, 789]` |
| `selectedStatus` | object | нет | Фильтр по статусу продукта | см. ниже |
| `selectedStatus[title]` | string | нет | Название статуса (для UI) | `"Все товары"` |
| `selectedStatus[name]` | string | нет | Ключ статуса | `"all"`, `"popular"`, `"new"`, `"isdiscount"` |
| `selectedStatus[condition]` | object | нет | SQL условия для WHERE (ключ = колонка, значение = условие) | `{"content.deleted": 0, "product.popular": 1}` |
| `sortBy` | object | нет | Параметры сортировки | см. ниже |
| `sortBy[sortby]` | string | нет | Поле для сортировки или `"rank"` для кастомной сортировки | `"rank"`, `"product.price"`, `"content.createdon"` |
| `sortBy[dir]` | string | нет | Направление сортировки | `"asc"`, `"desc"` |
| `statusesDraggableInAll` | array[string] | нет | Статусы, доступные для drag-and-drop при `categoryId=0` | `["popular", "new", "isdiscount"]` |
| `limit` | integer | нет | Количество товаров на странице (пагинация) | `15`, `50`, `100` |
| `offset` | integer | нет | Смещение для пагинации (начинается с 0) | `0`, `15`, `30` |
| `needComposition` | integer | нет | Включить состав товара (TV поле `composition`) | `0`, `1` |
| `timestamp` | integer | нет | Автоматически добавляется axios interceptor'ом | `1769659240709` |

## Примеры использования

### 1. Все товары (базовый запрос)
```
https://flowers5-serv.uplinkweb.ru/5042/api/products?categoryId=0&limit=15&offset=0
```

### 2. Товары в категории с фильтром и сортировкой
```
https://flowers5-serv.uplinkweb.ru/5042/api/products?
  categoryId=10
  &selectedStatus[condition][content.deleted]=0
  &sortBy[sortby]=rank
  &sortBy[dir]=asc
  &limit=20
  &offset=0
```

### 3. Поиск по названию
```
https://flowers5-serv.uplinkweb.ru/5042/api/products?
  searchQuery=роза
  &categoryId=0
  &limit=50
```

### 4. Популярные товары с кастомной сортировкой
```
https://flowers5-serv.uplinkweb.ru/5042/api/products?
  categoryId=0
  &selectedStatus[name]=popular
  &selectedStatus[condition][product.popular]=1
  &selectedStatus[condition][content.deleted]=0
  &sortBy[sortby]=rank
  &sortBy[dir]=desc
  &statusesDraggableInAll=["popular","new","isdiscount"]
  &limit=15
```

### 5. Онлайн-витрина (categoryId = -1)
```
https://flowers5-serv.uplinkweb.ru/5042/api/products?
  categoryId=-1
  &sortBy[sortby]=rank
  &limit=30
```

### 6. Со составом товара
```
https://flowers5-serv.uplinkweb.ru/5042/api/products?
  categoryId=0
  &needComposition=1
  &limit=10
```

### 7. Реальный пример (из production)
```
https://flowers5-serv.uplinkweb.ru/5042/api/products?categoryId=0&selectedStatus%5Btitle%5D=%D0%92%D1%81%D0%B5+%D1%82%D0%BE%D0%B2%D0%B0%D1%80%D1%8B&selectedStatus%5Bname%5D=all&selectedStatus%5Bcount%5D=0&selectedStatus%5Bcondition%5D%5Bcontent.deleted%5D=0&sortBy%5Bname%5D=%D0%9F%D0%BE+%D1%83%D0%BC%D0%BE%D0%BB%D1%87%D0%B0%D0%BD%D0%B8%D1%8E&sortBy%5Bsortby%5D=rank&sortBy%5Bdir%5D=asc&sortBy%5BadminVersion%5D%5B0%5D=4&sortBy%5BadminVersion%5D%5B1%5D=5&sortBy%5BadminVersion%5D%5B2%5D=6&sortBy%5BadminVersion%5D%5B3%5D=%D0%9E%D0%BD%D0%BB%D0%B0%D0%B9%D0%BD-%D0%B2%D0%B8%D1%82%D1%80%D0%B8%D0%BD%D0%B0&sortBy%5BadminVersion%5D%5B4%5D=%D0%A4%D0%BB%D0%BE%D1%80%D0%B8%D1%8F+%D0%9C%D0%B8%D0%BD%D0%B8&sortBy%5BadminVersion%5D%5B5%5D=Ultron&sortBy%5BadminVersion%5D%5B6%5D=7&statusesDraggableInAll=%5B%22popular%22,%22new%22,%22isdiscount%22,%22online_showcase%22%5D&limit=15&offset=0&searchQuery=&timestamp=1769659240709
```

Декодированный вариант:
```
https://flowers5-serv.uplinkweb.ru/5042/api/products?
  categoryId=0
  &selectedStatus[title]=Все товары
  &selectedStatus[name]=all
  &selectedStatus[count]=0
  &selectedStatus[condition][content.deleted]=0
  &sortBy[name]=По умолчанию
  &sortBy[sortby]=rank
  &sortBy[dir]=asc
  &sortBy[adminVersion][1]=5
  &statusesDraggableInAll=["popular","new","isdiscount","online_showcase"]
  &limit=15
  &offset=0
  &searchQuery=
  &timestamp=1769659240709
```

## Структура ответа

```json
[
  {
    "id": 123,
    "name": "Розы красные",
    "price": 1500,
    "old_price": 2000,
    "images": [
      {
        "rank": 0,
        "url": "assets/images/products/123/rose.jpg"
      }
    ],
    "related_categories": [10, 20],
    "holiday_categories": [15],
    "category": "Свежие цветы",
    "parent_category": "Цветы",
    "createdon": "2024-01-15",
    "editedon": "2024-01-20",
    "published": 1,
    "popular": 1,
    "new": 0,
    "isdiscount": 1,
    "discount": 10,
    "customRank": 5,
    "modsExist": 1,
    "composition": "[{\"sostav\":\"Роза\",\"kolichestvo\":5}]"
  }
]
```

## Поля в ответе

| Поле | Тип | Описание |
|------|-----|---------|
| `id` | integer | ID продукта (primary key) |
| `name` | string | Название товара |
| `price` | number | Текущая цена |
| `old_price` | number | Старая цена |
| `images` | array | Массив изображений `{rank, url}` |
| `related_categories` | array | ID связанных категорий (исключая праздничные) |
| `holiday_categories` | array | ID праздничных категорий |
| `category` | string | Название основной категории |
| `parent_category` | string | Название родительской категории |
| `createdon` | timestamp | Дата создания |
| `editedon` | timestamp | Дата последнего редактирования |
| `menuindex` | integer | Индекс в меню (для сортировки) |
| `uri` | string | URL продукта |
| `published` | integer | Опубликовано (0/1) |
| `deleted` | integer | Удалено (0/1) |
| `popular` | integer | Популярный товар (0/1) |
| `new` | integer | Новый товар (0/1) |
| `isdiscount` | integer | Имеет скидку (0/1) |
| `discount` | number | Размер скидки (%) |
| `is_discount_number` | integer | Флаг числовой скидки |
| `online_showcase` | integer | В онлайн-витрине (0/1) |
| `assembled_today` | integer | Собирается сегодня (0/1) |
| `not_available` | integer | Недоступен (0/1) |
| `favorite` | integer | В избранном (0/1) |
| `on_index_page` | integer | На главной странице (0/1) |
| `rank_popular` | integer | Ранг в популярных |
| `rank_new` | integer | Ранг в новых |
| `rank_discount` | integer | Ранг в скидках |
| `rank_online_showcase` | integer | Ранг в онлайн-витрине |
| `customRank` | integer | Кастомный ранг в категории (если задан) |
| `modsExist` | integer | Количество модификаций товара |
| `composition` | string | JSON состав товара (если `needComposition=1`) |
| `vk_id` | integer | ID интеграции с VK |
| `number_sales` | integer | Количество продаж |

## Особенности фильтрации

### selectedStatus[condition]
Объект с SQL условиями. Используется для фильтрации по статусу товара.

**Примеры:**
```javascript
// Все товары, которые не удалены
selectedStatus[condition][content.deleted]=0

// Популярные товары
selectedStatus[condition][product.popular]=1

// Товары со скидкой и не удалённые
selectedStatus[condition][product.isdiscount]=1
selectedStatus[condition][content.deleted]=0

// С операторами сравнения
selectedStatus[condition][product.price > 1000]
```

**Поддерживаемые поля:**
- `content.deleted`, `content.published`, `content.menuindex`, `content.createdon`, `content.editedon`
- `product.popular`, `product.new`, `product.isdiscount`, `product.discount`, `product.online_showcase`
- `product.assembled_today`, `product.not_available`, `product.favorite`, `product.on_index_page`
- `product.price`, `product.old_price`, `product.number_sales`

### sortBy[sortby]
Определяет поле и направление сортировки.

**Доступные значения:**
- `"rank"` — кастомная сортировка по рангу (для категорий или статусов из `statusesDraggableInAll`)
- `"product.price"` — по цене
- `"content.createdon"` — по дате создания
- `"content.editedon"` — по дате редактирования
- `"content.menuindex"` — по индексу в меню
- `"product.number_sales"` — по количеству продаж
- `"popular"`, `"new"`, `"discount"` — по соответствующему рангу

**Направления:**
- `"asc"` — по возрастанию
- `"desc"` — по убыванию

**Пример:**
```javascript
sortBy[sortby]=rank
sortBy[dir]=asc
```

### categoryId логика
- **`0`** — все товары (игнорирует связь с категориями)
- **`> 0`** — товары в категории и её подкатегориях:
  - Основная категория (`content.parent = categoryId`)
  - Связанные категории (`modx_ms2_product_categories`)
  - Подкатегории (`parent IN (SELECT id FROM ... parent = categoryId)`)
  - Товары в подкатегориях
- **`-1`** — онлайн-витрина (фильтр по `product.online_showcase` или `product.assembled_today` в зависимости от версии)

### statusesDraggableInAll
Массив статусов, для которых разрешена сортировка по `rank` при `categoryId=0` (все категории).

**Пример:**
```javascript
statusesDraggableInAll=["popular","new","isdiscount","online_showcase"]
```

Это позволяет перетаскивать товары и менять их ранг в определённых статусах на главной странице.

## Пагинация

```javascript
// Первая страница
limit=15&offset=0

// Вторая страница
limit=15&offset=15

// Третья страница
limit=15&offset=30
```

Максимальное количество товаров в одном ответе обычно `limit=100`, но может быть ограничено на сервере.

## Ошибки и исключения

### 400 Bad Request
```json
{
  "error": "Invalid parameters",
  "message": "categoryId must be an integer"
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized",
  "error": "Missing or invalid token"
}
```

Требуется аутентификация через токен (если он установлен в `.env` на сервере).

### 500 Internal Server Error
```json
{
  "error": "Database error",
  "message": "Query failed"
}
```

## Аутентификация

**Способы передачи токена:**

### 1. Через заголовок Authorization (рекомендуется)
```
Authorization: Bearer <ваш_токен>
```

### 2. Через query параметр
```
?token=<ваш_токен>
```

**Примеры:**

#### cURL с заголовком
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "https://flowers5-serv.uplinkweb.ru/5042/api/products?categoryId=0&limit=15"
```

#### cURL с query параметром
```bash
curl "https://flowers5-serv.uplinkweb.ru/5042/api/products?categoryId=0&limit=15&token=<TOKEN>"
```

#### JavaScript/Fetch API
```javascript
fetch('https://flowers5-serv.uplinkweb.ru/5042/api/products?categoryId=0&limit=15', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer <TOKEN>',
    'Content-Type': 'application/json'
  }
})
```

#### Axios
```javascript
axios.defaults.headers.common['Authorization'] = 'Bearer <TOKEN>';
// или
axios.get('/api/products?categoryId=0&limit=15', {
  headers: {
    'Authorization': 'Bearer <TOKEN>'
  }
})
```

## Производительность

- Запрос с `needComposition=1` медленнее из-за парсинга TV полей
- Большие значения `limit` (>100) могут увеличить время ответа
- Рекомендуется использовать `offset` для пагинации, не загружать все товары сразу
- `searchQuery` может быть затратным при наличии большого количества товаров