-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables to ensure clean schema (development only)
DROP TABLE IF EXISTS structure_alerts CASCADE;
DROP TABLE IF EXISTS scrape_logs CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TYPE IF EXISTS scrape_status CASCADE;

-- Enum for scrape log status
CREATE TYPE scrape_status AS ENUM ('success', 'retried', 'failed');

-- Table: products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    image_url TEXT,
    currency TEXT DEFAULT 'USD',
    scrape_interval_minutes INTEGER DEFAULT 120,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(url)
);

-- Table: price_history
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(12,2) NOT NULL,
    in_stock BOOLEAN NOT NULL,
    stock_text TEXT,
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for price_history
CREATE INDEX idx_price_history_product_time ON price_history(product_id, scraped_at DESC);

-- Table: scrape_logs
CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    status scrape_status NOT NULL,
    attempts INTEGER DEFAULT 1,
    duration_ms INTEGER,
    http_status INTEGER,
    error_message TEXT,
    strategy TEXT, -- 'http' or 'browser'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for scrape_logs
CREATE INDEX idx_scrape_logs_product_time ON scrape_logs(product_id, created_at DESC);

-- Table: structure_alerts
CREATE TABLE IF NOT EXISTS structure_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    missing_selectors JSONB,
    raw_snippet TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS setup (Backend uses Service Role Key, so RLS policies can be highly restrictive for public access)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE structure_alerts ENABLE ROW LEVEL SECURITY;

-- Deny all public access by default; service key bypasses RLS.
CREATE POLICY deny_all_public_products ON products FOR ALL USING (false);
CREATE POLICY deny_all_public_history ON price_history FOR ALL USING (false);
CREATE POLICY deny_all_public_logs ON scrape_logs FOR ALL USING (false);
CREATE POLICY deny_all_public_alerts ON structure_alerts FOR ALL USING (false);
