CREATE TABLE IF NOT EXISTS products (
  sku VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distributors (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  trailing_points INTEGER NOT NULL DEFAULT 0,
  loyalty_tier VARCHAR(20) NOT NULL DEFAULT 'Bronze' CHECK (loyalty_tier IN ('Bronze','Silver','Gold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_managers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  distributor_id VARCHAR(50) NOT NULL REFERENCES distributors(id),
  status VARCHAR(30) NOT NULL CHECK (status IN ('placed','pendingApproval','confirmed','dispatched','delivered','rejected','cancelled')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_after_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL REFERENCES products(sku),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO products (sku, name, unit_price, stock_quantity, reserved_quantity)
VALUES
  ('P-100', 'Premium Soap', 120.00, 150, 0),
  ('P-101', 'Laundry Powder', 260.00, 0, 0),
  ('P-102', 'Cereal Box', 180.00, 1, 0),
  ('P-200', 'Rice Pack', 220.00, 90, 0),
  ('P-300', 'Detergent Box', 340.00, 210, 0),
  ('P-400', 'Toothpaste', 180.00, 330, 0),
  ('P-500', 'Cooking Oil', 420.00, 75, 0),
  ('P-600', 'Shampoo', 250.00, 160, 0)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO distributors (id, name, credit_limit, trailing_points, loyalty_tier)
VALUES
  ('D-101', 'North Point Retail', 5000.00, 400, 'Bronze'),
  ('D-102', 'Metro Supply Co.', 15000.00, 2200, 'Silver'),
  ('D-103', 'Prime Trade Hub', 25000.00, 6200, 'Gold')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_managers (name, email)
VALUES ('Ava Manager', 'ava.manager@metayb.com')
ON CONFLICT DO NOTHING;

INSERT INTO orders (id, distributor_id, status, subtotal, discount_rate, discount_amount, total_after_discount, points_earned)
VALUES
  ('ORD-201', 'D-102', 'confirmed', 2200.00, 0.03, 66.00, 2134.00, 21),
  ('ORD-202', 'D-103', 'confirmed', 5200.00, 0.06, 312.00, 4888.00, 48),
  ('ORD-203', 'D-102', 'dispatched', 1500.00, 0.03, 45.00, 1455.00, 14)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (order_id, sku, quantity, unit_price, line_total)
VALUES
  ('ORD-201', 'P-200', 5, 220.00, 1100.00),
  ('ORD-201', 'P-300', 3, 340.00, 1020.00),
  ('ORD-202', 'P-500', 7, 420.00, 2940.00),
  ('ORD-202', 'P-600', 3, 250.00, 750.00),
  ('ORD-203', 'P-400', 5, 180.00, 900.00)
ON CONFLICT DO NOTHING;

UPDATE distributors
SET trailing_points = CASE id
  WHEN 'D-102' THEN 2200
  WHEN 'D-103' THEN 6200
  ELSE trailing_points
END,
loyalty_tier = CASE id
  WHEN 'D-102' THEN 'Silver'
  WHEN 'D-103' THEN 'Gold'
  ELSE 'Bronze'
END;
