-- Arab Academy ma'lumotlar bazasi sxemasi (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    full_name TEXT NOT NULL,
    lang VARCHAR(10) DEFAULT 'uz',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT REFERENCES users(telegram_id),
    group_id INT NOT NULL,
    check_file_id TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT REFERENCES users(telegram_id),
    group_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    current_month_points INT DEFAULT 0,
    total_points INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(telegram_id, group_id)
);
