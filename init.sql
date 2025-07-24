-- Initialize database for Stock Backtester
-- This file will be executed when the PostgreSQL container starts

-- Create database (if not exists)
SELECT 'CREATE DATABASE testdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'testdb')\gexec

-- Connect to the database
\c testdb;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create backtest_runs table
CREATE TABLE IF NOT EXISTS backtest_runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    ticker VARCHAR(10) NOT NULL,
    start_date VARCHAR(10) NOT NULL,
    end_date VARCHAR(10) NOT NULL,
    sma_period INTEGER NOT NULL,
    rule_condition VARCHAR(50) NOT NULL,
    rule_then_action VARCHAR(20) NOT NULL,
    rule_else_action VARCHAR(20) NOT NULL,
    total_return DECIMAL(10,2) NOT NULL,
    win_rate DECIMAL(5,2) NOT NULL,
    number_of_trades INTEGER NOT NULL,
    final_portfolio_value DECIMAL(15,2) NOT NULL,
    sharpe_ratio DECIMAL(8,4) NOT NULL,
    equity_curve JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_seconds DECIMAL(8,3)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_backtest_runs_user_id ON backtest_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_ticker ON backtest_runs(ticker);
CREATE INDEX IF NOT EXISTS idx_backtest_runs_created_at ON backtest_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert sample data (optional)
INSERT INTO users (email, hashed_password, is_premium) VALUES 
('demo@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Create a view for backtest analytics
CREATE OR REPLACE VIEW backtest_analytics AS
SELECT 
    ticker,
    COUNT(*) as total_runs,
    AVG(total_return) as avg_return,
    AVG(win_rate) as avg_win_rate,
    AVG(number_of_trades) as avg_trades,
    MAX(created_at) as last_run
FROM backtest_runs 
GROUP BY ticker
ORDER BY total_runs DESC;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO user;