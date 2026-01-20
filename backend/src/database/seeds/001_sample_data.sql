-- Seed данные для демонстрации работы приложения

-- Категории товаров (цветы)
INSERT INTO categories (posiflora_id, name, slug, description, image_url, sort_order, is_active) VALUES
('cat_1', 'Розы', 'roses', 'Классические розы различных оттенков', 'https://images.unsplash.com/photo-1518621012428-7018d6820c89?w=400', 1, true),
('cat_2', 'Тюльпаны', 'tulips', 'Яркие весенние тюльпаны', 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=400', 2, true),
('cat_3', 'Хризантемы', 'chrysanthemums', 'Пышные хризантемы разных цветов', 'https://images.unsplash.com/photo-1633287387306-f08b4b7114e8?w=400', 3, true),
('cat_4', 'Сборные букеты', 'bouquets', 'Готовые букеты из различных цветов', 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=400', 4, true),
('cat_5', 'Комнатные растения', 'indoor', 'Комнатные растения для дома', 'https://images.unsplash.com/photo-1463946027011-90e5e32b8bb4?w=400', 5, true)
ON CONFLICT (posiflora_id) DO NOTHING;

-- Товары (цветы)
INSERT INTO products (posiflora_id, name, description, price, old_price, currency, category_id, images, article, sku, in_stock, stock_quantity, bonus_percent) VALUES
('prod_1', 'Букет красных роз', 'Роскошный букет из 11 красных роз, идеально подходит для выражения любви', 2500.00, 3000.00, 'RUB', 1, '["https://images.unsplash.com/photo-1518621012428-7018d6820c89?w=600", "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600"]'::jsonb, 'ROSES-11-RED', 'SKU-001', true, 15, 5),
('prod_2', 'Букет белых роз', 'Элегантный букет из 9 белых роз, символ чистоты и невинности', 2200.00, NULL, 'RUB', 1, '["https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=600"]'::jsonb, 'ROSES-9-WHITE', 'SKU-002', true, 10, 5),
('prod_3', 'Букет розовых роз', 'Нежный букет из 7 розовых роз, прекрасный подарок для близких', 1800.00, NULL, 'RUB', 1, '["https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600"]'::jsonb, 'ROSES-7-PINK', 'SKU-003', true, 12, 5),
('prod_4', 'Букет тюльпанов красных', 'Яркий букет из 15 красных тюльпанов, символ страсти', 1200.00, 1500.00, 'RUB', 2, '["https://images.unsplash.com/photo-1520763185298-1b434c919102?w=600"]'::jsonb, 'TULIP-15-RED', 'SKU-004', true, 20, 3),
('prod_5', 'Букет тюльпанов разноцветных', 'Яркий микс из 20 разноцветных тюльпанов', 1500.00, NULL, 'RUB', 2, '["https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600"]'::jsonb, 'TULIP-20-MIX', 'SKU-005', true, 18, 3),
('prod_6', 'Хризантемы белые', 'Пышный букет из белых хризантем (25 шт)', 1400.00, NULL, 'RUB', 3, '["https://images.unsplash.com/photo-1633287387306-f08b4b7114e8?w=600"]'::jsonb, 'CHRYS-25-WHITE', 'SKU-006', true, 14, 4),
('prod_7', 'Хризантемы жёлтые', 'Солнечный букет из жёлтых хризантем (20 шт)', 1300.00, NULL, 'RUB', 3, '["https://images.unsplash.com/photo-1606041008023-472dfb5e530f?w=600"]'::jsonb, 'CHRYS-20-YELLOW', 'SKU-007', true, 16, 4),
('prod_8', 'Свадебный букет', 'Роскошный свадебный букет из роз, пионов и эвкалипта', 4500.00, 5000.00, 'RUB', 4, '["https://images.unsplash.com/photo-1606041008023-472dfb5e530f?w=600"]'::jsonb, 'BOUQ-WEDDING', 'SKU-008', true, 5, 7),
('prod_9', 'Романтический букет', 'Нежный букет из роз, тюльпанов и гипсофилы', 2800.00, NULL, 'RUB', 4, '["https://images.unsplash.com/photo-1518621012428-7018d6820c89?w=600"]'::jsonb, 'BOUQ-ROMANTIC', 'SKU-009', true, 8, 6),
('prod_10', 'Букет на день рождения', 'Яркий праздничный букет из различных цветов', 2200.00, 2500.00, 'RUB', 4, '["https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600"]'::jsonb, 'BOUQ-BIRTHDAY', 'SKU-010', true, 10, 5),
('prod_11', 'Фикус Бенджамина', 'Красивое комнатное растение, высота 40-50 см', 1200.00, NULL, 'RUB', 5, '["https://images.unsplash.com/photo-1463946027011-90e5e32b8bb4?w=600"]'::jsonb, 'INDOOR-FICUS', 'SKU-011', true, 12, 2),
('prod_12', 'Монстера', 'Модное комнатное растение, высота 50-60 см', 1800.00, 2000.00, 'RUB', 5, '["https://images.unsplash.com/photo-1463946027011-90e5e32b8bb4?w=600"]'::jsonb, 'INDOOR-MONSTERA', 'SKU-012', true, 8, 3),
('prod_13', 'Роза в горшке', 'Красная роза в горшке, идеально для дома', 800.00, NULL, 'RUB', 5, '["https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=600"]'::jsonb, 'INDOOR-ROSE', 'SKU-013', true, 15, 2)
ON CONFLICT (posiflora_id) DO NOTHING;

-- Точки самовывоза
INSERT INTO pickup_points (posiflora_id, name, address, working_hours, phone, description, map_url, coordinates, is_active, sort_order) VALUES
('pickup_1', 'Магазин на Тверской', '{"city": "Москва", "street": "Тверская улица", "house": "10", "postal_code": "101000"}'::jsonb, '{"monday": "09:00-21:00", "tuesday": "09:00-21:00", "wednesday": "09:00-21:00", "thursday": "09:00-21:00", "friday": "09:00-21:00", "saturday": "10:00-20:00", "sunday": "10:00-20:00"}'::jsonb, '+7 (495) 123-45-67', 'Основной магазин в центре Москвы', 'https://yandex.ru/maps/-/CDQrFBVx', '{"lat": 55.7558, "lng": 37.6173}'::jsonb, true, 1),
('pickup_2', 'Магазин на Арбате', '{"city": "Москва", "street": "Арбат", "house": "25", "postal_code": "119002"}'::jsonb, '{"monday": "10:00-20:00", "tuesday": "10:00-20:00", "wednesday": "10:00-20:00", "thursday": "10:00-20:00", "friday": "10:00-20:00", "saturday": "10:00-19:00", "sunday": "10:00-19:00"}'::jsonb, '+7 (495) 234-56-78', 'Магазин в историческом центре', 'https://yandex.ru/maps/-/CDQrFBVx', '{"lat": 55.7520, "lng": 37.5930}'::jsonb, true, 2)
ON CONFLICT (posiflora_id) DO NOTHING;
