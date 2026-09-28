-- Ashkelon Sea View — Phase 1 schema
-- Derived from Ashkelon-FINAL-Cursor-Ready-v3.0 nextjs-app usage

create extension if not exists "pgcrypto";

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  phone text not null,
  email text,
  checkin date not null,
  checkout date not null,
  guests_count int not null default 2,
  total numeric(10,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'failed')),
  source text not null default 'direct_website',
  wallet_token text unique,
  payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  source text not null default 'manual',
  booking_id uuid references public.bookings(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (date, source, booking_id)
);

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'manual',
  start_date date not null,
  end_date date not null,
  price numeric(10,2) not null,
  min_nights int default 1,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.guests (
  phone text primary key,
  name text,
  last_stay date,
  total_stays int not null default 0,
  vip boolean not null default false,
  blacklisted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  checkout_date date,
  status text not null default 'To Clean'
    check (status in ('To Clean', 'In Progress', 'Done', 'Photo OK')),
  cleaner text,
  checklist text[] default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_checkin_idx on public.bookings (checkin);
create index if not exists bookings_checkout_idx on public.bookings (checkout);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_wallet_token_idx on public.bookings (wallet_token);
create index if not exists blocked_dates_date_idx on public.blocked_dates (date);
create index if not exists pricing_rules_range_idx on public.pricing_rules (start_date, end_date);
create index if not exists cleaning_tasks_checkout_idx on public.cleaning_tasks (checkout_date);

alter table public.bookings enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.guests enable row level security;
alter table public.cleaning_tasks enable row level security;

-- Service role bypasses RLS; allow anon read of blocked dates for calendar UI if needed later
drop policy if exists "public read blocked_dates" on public.blocked_dates;
create policy "public read blocked_dates"
  on public.blocked_dates for select
  to anon, authenticated
  using (true);
