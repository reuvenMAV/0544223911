-- Telegram channel integration for English coach

create table if not exists public.telegram_learners (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  learner_id uuid not null references public.learners(id) on delete cascade,
  chat_id bigint not null,
  status text not null default 'active' check (status in ('pending', 'active', 'blocked', 'stopped')),
  locale text not null default 'he',
  awaiting_text boolean not null default false,
  session_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint telegram_learners_telegram_user_id_key unique (telegram_user_id)
);

create index if not exists telegram_learners_learner_id_idx
  on public.telegram_learners(learner_id);

create table if not exists public.telegram_updates (
  id uuid primary key default gen_random_uuid(),
  telegram_bot_id text not null,
  update_id bigint not null,
  telegram_user_id bigint,
  processed_at timestamptz not null default now(),
  constraint telegram_updates_bot_update_key unique (telegram_bot_id, update_id)
);

create table if not exists public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  learner_id uuid not null references public.learners(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint telegram_link_codes_code_key unique (code)
);

create index if not exists telegram_link_codes_learner_id_idx
  on public.telegram_link_codes(learner_id);

create table if not exists public.telegram_callback_tokens (
  token text primary key,
  learner_id uuid not null references public.learners(id) on delete cascade,
  session_id uuid not null,
  choice_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists telegram_callback_tokens_expires_idx
  on public.telegram_callback_tokens(expires_at);

create table if not exists public.telegram_message_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  telegram_update_id bigint,
  telegram_user_id_masked text,
  chat_id_masked text,
  learner_id uuid references public.learners(id) on delete set null,
  channel text not null default 'telegram',
  phase text,
  prompt_version text,
  schema_version text,
  workflow_version text,
  response_ms integer,
  send_ok boolean,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists telegram_message_log_request_id_idx
  on public.telegram_message_log(request_id);

alter table public.sessions
  add column if not exists channel text not null default 'web',
  add column if not exists request_id uuid,
  add column if not exists prompt_version text,
  add column if not exists schema_version text,
  add column if not exists workflow_version text;
