alter table public.temple_profiles
  add column if not exists religion text,
  add column if not exists religion_other text,
  add column if not exists sect_denomination text,
  add column if not exists historical_significance text,
  add column if not exists theme_preset text,
  add column if not exists background_style text default 'Light',
  add column if not exists service_languages jsonb default '[]',
  add column if not exists dress_code_mode text,
  add column if not exists entry_fee_enabled boolean default false,
  add column if not exists entry_fee_currency text default 'INR',
  add column if not exists special_entry_rules text,
  add column if not exists major_annual_festivals jsonb default '[]',
  add column if not exists weekly_special_prayers jsonb default '[]',
  add column if not exists special_events_text text,
  add column if not exists booking_enabled boolean default true,
  add column if not exists slot_duration int default 30,
  add column if not exists max_visitors_per_slot int,
  add column if not exists advance_booking_window int default 7,
  add column if not exists special_puja_bookings jsonb default '[]';

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.booking_control_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id text,
  action text not null,
  reason text,
  resume_at timestamptz,
  created_at timestamptz default now()
);

alter table public.system_settings disable row level security;
alter table public.booking_control_audit disable row level security;

create index if not exists idx_registered_temples_slug on public.registered_temples (slug);
create index if not exists idx_registered_temples_created_at on public.registered_temples (created_at desc);
create index if not exists idx_temple_profiles_religion on public.temple_profiles (religion);
create index if not exists idx_temple_profiles_primary_color on public.temple_profiles (primary_color);
create index if not exists idx_booking_control_audit_created_at on public.booking_control_audit (created_at desc);
