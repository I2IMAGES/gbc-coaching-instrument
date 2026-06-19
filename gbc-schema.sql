-- GBC Coaching Instrument — Supabase Schema
-- Run in Supabase SQL editor or via MCP apply_migration
-- Project: joopdhoxkjexqrygusom (BridgeBuilder / I2O)
-- Applied: 2026-06-19

-- Session codes (issued by EJ, one per client engagement)
create table if not exists gbc_sessions (
  id           uuid primary key default gen_random_uuid(),
  session_code text not null unique,
  status       text not null default 'active',
  created_at   timestamptz not null default now()
);

-- Touch events (no PII, no content — timestamps and booleans only)
create table if not exists gbc_touches (
  id           uuid primary key default gen_random_uuid(),
  session_code text not null,
  touchpoint   text not null,
  committed    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Indexes for dashboard queries
create index if not exists gbc_touches_code_idx    on gbc_touches (session_code);
create index if not exists gbc_sessions_created_idx on gbc_sessions (created_at desc);

-- RLS: disabled for v1 per ADR-001
-- The Pages Function is the only client and uses the anon key server-side.
-- No public client access to these tables.
alter table gbc_sessions disable row level security;
alter table gbc_touches  disable row level security;
