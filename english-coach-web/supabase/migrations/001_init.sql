-- English coach MVP schema
create extension if not exists "pgcrypto";

create table if not exists public.learners (
  id uuid primary key,
  created_at timestamptz not null default now(),
  locale text not null default 'he',
  cefr_level text,
  learning_goal text,
  interests jsonb not null default '[]'::jsonb
);

create table if not exists public.progress (
  learner_id uuid primary key references public.learners(id) on delete cascade,
  current_phase text not null default 'onboarding',
  current_lesson_number integer not null default 0,
  progress_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key,
  learner_id uuid not null references public.learners(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary_json jsonb not null default '{}'::jsonb,
  status text not null default 'completed'
);

create index if not exists sessions_learner_id_idx on public.sessions(learner_id);
