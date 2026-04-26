-- Sessions + LLM chat feature migration
-- Run in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ── User profiles ──────────────────────────────────────────────
create table if not exists user_profiles (
  user_id                         uuid primary key,
  age                             int,
  weight_kg                       numeric,
  height_cm                       numeric,
  condition                       text,
  wheelchair_type                 text,
  cushion_type                    text,
  risk_level                      text check (risk_level in ('low', 'medium', 'high')),
  target_reposition_interval_sec  int default 1800,
  timezone                        text default 'America/Chicago',
  updated_at                      timestamptz default now()
);

-- ── Sessions ───────────────────────────────────────────────────
create table if not exists sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null,
  started_at            timestamptz not null default now(),
  ended_at              timestamptz,
  duration_sec          int,
  auto_ended            boolean default false,
  ended_reason          text check (ended_reason in ('user', 'no_pressure', 'ble_disconnect')),

  alerts_triggered      int default 0,
  shifts_completed      int default 0,
  repositions_detected  int default 0,
  longest_no_shift_sec  int,
  worst_zone            text,
  compliance_rate       numeric,
  avg_distribution      jsonb
);

create index if not exists sessions_user_started_idx
  on sessions (user_id, started_at desc);

-- ── Readings (derived metrics, every ~30s) ─────────────────────
create table if not exists readings (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references sessions(id) on delete cascade,
  recorded_at         timestamptz not null default now(),

  cop_x               numeric,
  cop_y               numeric,
  symmetry            numeric,
  max_pressure        numeric,
  max_pressure_zone   text,

  left_ischial        text check (left_ischial  in ('low', 'moderate', 'high')),
  right_ischial       text check (right_ischial in ('low', 'moderate', 'high')),
  left_thigh          text check (left_thigh    in ('low', 'moderate', 'high')),
  right_thigh         text check (right_thigh   in ('low', 'moderate', 'high')),
  center_zone         text check (center_zone   in ('low', 'moderate', 'high'))
);

create index if not exists readings_session_time_idx
  on readings (session_id, recorded_at);

-- ── Reading snapshots (full 16×16 grid, every 5 min) ──────────
create table if not exists reading_snapshots (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  recorded_at  timestamptz not null default now(),
  grid         int[] not null
);

create index if not exists snapshots_session_time_idx
  on reading_snapshots (session_id, recorded_at);

-- ── Alert events ──────────────────────────────────────────────
create table if not exists alert_events (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references sessions(id) on delete cascade,
  triggered_at         timestamptz not null default now(),
  acknowledged_at      timestamptz,
  shift_completed_at   timestamptz
);

create index if not exists alert_session_time_idx
  on alert_events (session_id, triggered_at);

-- ── Session summaries (LLM-generated) ─────────────────────────
create table if not exists session_summaries (
  session_id    uuid primary key references sessions(id) on delete cascade,
  summary_text  text not null,
  key_insight   text,
  generated_at  timestamptz not null default now()
);

-- ── Chat messages ─────────────────────────────────────────────
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  role        text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists chat_user_time_idx
  on chat_messages (user_id, created_at);
