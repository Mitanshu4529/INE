-- INE Store Price Tracker — PostgreSQL schema (Supabase)
-- Run this in the Supabase SQL editor before deploying.

create extension if not exists pgcrypto;

create table if not exists tracked_products (
  id uuid primary key default gen_random_uuid(),
  product_id integer not null unique,
  product_name text not null,
  product_slug text not null,
  product_url text not null,
  sku text,
  brand text,
  category text,
  current_price numeric(12,2),
  current_stock integer,
  tracking_status boolean not null default true,
  last_scrape_status text,
  last_scrape_at timestamptz,
  last_successful_scrape_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracked_products_last_status_chk
    check (last_scrape_status is null or last_scrape_status in ('SUCCESS', 'RETRYING', 'FAILED'))
);

create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  tracked_product_id uuid not null references tracked_products(id) on delete cascade,
  price numeric(12,2) not null,
  stock integer not null,
  scraped_at timestamptz not null default now(),
  constraint price_history_price_chk check (price >= 0),
  constraint price_history_stock_chk check (stock >= 0)
);

create table if not exists scrape_logs (
  id uuid primary key default gen_random_uuid(),
  tracked_product_id uuid not null references tracked_products(id) on delete cascade,
  attempt_timestamp timestamptz not null default now(),
  status text not null,
  attempt_number integer not null,
  duration_ms integer,
  error_message text,
  http_status integer,
  details jsonb,
  constraint scrape_logs_status_chk check (status in ('SUCCESS', 'RETRYING', 'FAILED')),
  constraint scrape_logs_attempt_chk check (attempt_number >= 1)
);

create index if not exists idx_price_history_product_time
  on price_history (tracked_product_id, scraped_at desc);

create index if not exists idx_scrape_logs_product_time
  on scrape_logs (tracked_product_id, attempt_timestamp desc);

create index if not exists idx_tracked_products_status
  on tracked_products (tracking_status);

create index if not exists idx_tracked_products_product_id
  on tracked_products (product_id);

-- Row Level Security: the backend uses the service role key, which bypasses RLS.
-- Still enable RLS so anon/public clients cannot read or write tracker data directly.
alter table tracked_products enable row level security;
alter table price_history enable row level security;
alter table scrape_logs enable row level security;
