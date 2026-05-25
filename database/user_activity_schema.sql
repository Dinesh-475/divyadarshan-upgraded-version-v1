-- 1. User Profiles Table
create table if not exists public.user_profiles (
  phone text primary key,
  name text not null,
  city text,
  created_at timestamptz default now()
);

-- Disable Row Level Security (RLS) for simple integration with service role access
alter table public.user_profiles disable row level security;

-- 2. Parking Zones Table
create table if not exists public.parking_zones (
  id uuid primary key default gen_random_uuid(),
  temple_key text not null,
  zone_index int not null,
  name text not null,
  capacity int not null,
  filled int not null default 0,
  distance text,
  created_at timestamptz default now()
);

alter table public.parking_zones disable row level security;
create unique index if not exists idx_parking_zones_key_idx on public.parking_zones (temple_key, zone_index);

-- 3. Parking Reservations Table
create table if not exists public.parking_reservations (
  id uuid primary key default gen_random_uuid(),
  phone text not null references public.user_profiles(phone) on delete cascade,
  temple_key text not null,
  zone_index int not null,
  zone_name text not null,
  slot_ref text not null,
  status text not null default 'Reserved',
  created_at timestamptz default now()
);

alter table public.parking_reservations disable row level security;

-- 4. User Activities Table
create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  phone text,
  user_name text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.user_activities disable row level security;

-- Indexes for performance & concurrency
create index if not exists idx_user_profiles_created_at on public.user_profiles (created_at desc);
create index if not exists idx_parking_reservations_phone on public.parking_reservations (phone);
create index if not exists idx_parking_reservations_temple on public.parking_reservations (temple_key);
create index if not exists idx_user_activities_phone on public.user_activities (phone);
create index if not exists idx_user_activities_created_at on public.user_activities (created_at desc);
