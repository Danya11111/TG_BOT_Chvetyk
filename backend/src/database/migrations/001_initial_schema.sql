-- Создание основных таблиц

-- Пользователи (клиенты)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  bonus_balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Категории товаров
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  posiflora_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  image_url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Товары (синхронизация с Posiflora)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  posiflora_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  old_price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'RUB',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  images JSONB DEFAULT '[]'::jsonb,
  article VARCHAR(255),
  sku VARCHAR(255),
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INTEGER,
  bonus_percent DECIMAL(5, 2),
  weight DECIMAL(10, 2),
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Корзина пользователя
CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- Заказы
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  posiflora_order_id VARCHAR(255),
  
  -- Данные клиента
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  
  -- Статус заказа
  status VARCHAR(50) DEFAULT 'new',
  status_code INTEGER DEFAULT 0,
  
  -- Доставка
  delivery_type VARCHAR(20) NOT NULL, -- 'delivery' или 'pickup'
  delivery_address JSONB,
  pickup_point_id INTEGER,
  delivery_cost DECIMAL(10, 2) DEFAULT 0,
  delivery_date DATE,
  delivery_time TIME,
  
  -- Оплата
  payment_type VARCHAR(50) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending',
  
  -- Бонусы
  bonus_used DECIMAL(10, 2) DEFAULT 0,
  bonus_accrued DECIMAL(10, 2) DEFAULT 0,
  
  -- Суммы
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Дополнительно
  comment TEXT,
  source VARCHAR(50) DEFAULT 'telegram_bot',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Товары в заказе
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  product_image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- История изменения статусов заказа
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  status_code INTEGER,
  comment TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- История операций с бонусами
CREATE TABLE IF NOT EXISTS bonus_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'accrued', 'used', 'expired', 'cancelled'
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Точки самовывоза
CREATE TABLE IF NOT EXISTS pickup_points (
  id SERIAL PRIMARY KEY,
  posiflora_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  address JSONB NOT NULL,
  working_hours JSONB,
  phone VARCHAR(50),
  description TEXT,
  image_url VARCHAR(500),
  map_url VARCHAR(500),
  coordinates JSONB,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_products_posiflora_id ON products(posiflora_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_bonus_history_user_id ON bonus_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pickup_points_is_active ON pickup_points(is_active);
