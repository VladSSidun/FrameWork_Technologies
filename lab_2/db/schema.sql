/*
-- структура таблиці продуктів
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  qty INT DEFAULT 0,
  category VARCHAR(255) DEFAULT NULL,
  image VARCHAR(255) DEFAULT NULL,
  discount INT DEFAULT 0
);

-- службова таблиця для зберігання хешу схеми
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hash VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

-- структура таблиці продуктів
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  qty INT DEFAULT 0,
  category VARCHAR(255) DEFAULT NULL,
  image VARCHAR(255) DEFAULT NULL,
  discount INT DEFAULT 0
);

-- службова таблиця для зберігання хешу схеми
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hash VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
