-- Миграция для улучшения безопасности и производительности
-- Добавление CHECK constraints и дополнительных индексов

-- Валидация на уровне БД для orders
ALTER TABLE orders 
  ADD CONSTRAINT check_total_positive CHECK (total >= 0),
  ADD CONSTRAINT check_subtotal_positive CHECK (subtotal >= 0),
  ADD CONSTRAINT check_bonus_used_positive CHECK (bonus_used >= 0),
  ADD CONSTRAINT check_bonus_accrued_positive CHECK (bonus_accrued >= 0),
  ADD CONSTRAINT check_delivery_cost_positive CHECK (delivery_cost >= 0);

-- Валидация для order_items
ALTER TABLE order_items
  ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT check_price_positive CHECK (product_price >= 0),
  ADD CONSTRAINT check_total_positive CHECK (total >= 0);

-- Валидация для products
ALTER TABLE products
  ADD CONSTRAINT check_price_positive CHECK (price >= 0),
  ADD CONSTRAINT check_old_price_positive CHECK (old_price IS NULL OR old_price >= 0),
  ADD CONSTRAINT check_stock_quantity_positive CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  ADD CONSTRAINT check_bonus_percent_range CHECK (bonus_percent IS NULL OR (bonus_percent >= 0 AND bonus_percent <= 100)),
  ADD CONSTRAINT check_weight_positive CHECK (weight IS NULL OR weight >= 0);

-- Валидация для users
ALTER TABLE users
  ADD CONSTRAINT check_bonus_balance_positive CHECK (bonus_balance >= 0);

-- Валидация для bonus_history
ALTER TABLE bonus_history
  ADD CONSTRAINT check_amount_positive CHECK (amount >= 0);

-- Валидация для carts
ALTER TABLE carts
  ADD CONSTRAINT check_cart_quantity_positive CHECK (quantity > 0);

-- Дополнительные индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON order_status_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Композитные индексы для частых запросов
CREATE INDEX IF NOT EXISTS idx_products_category_stock ON products(category_id, in_stock) WHERE in_stock = true;
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);
