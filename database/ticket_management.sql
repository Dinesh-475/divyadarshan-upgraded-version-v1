create table if not exists public.ticket_inventory (
  id uuid primary key default gen_random_uuid(),
  temple_key text not null,
  temple_slug text,
  event_name text not null,
  ticket_type text not null,
  price numeric(10,2) not null default 0,
  total_seats int not null default 0,
  available_seats int not null default 0,
  booked_seats int not null default 0,
  booking_limit int not null default 10,
  status text not null default 'OPEN',
  event_date date,
  event_time text,
  description text,
  booking_enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bookings
  add column if not exists ticket_inventory_id uuid references public.ticket_inventory(id) on delete set null,
  add column if not exists event_name text;

alter table public.ticket_inventory disable row level security;

create index if not exists idx_ticket_inventory_temple_key on public.ticket_inventory (temple_key);
create index if not exists idx_ticket_inventory_temple_slug on public.ticket_inventory (temple_slug);
create index if not exists idx_ticket_inventory_status on public.ticket_inventory (status);
create index if not exists idx_ticket_inventory_created_at on public.ticket_inventory (created_at desc);

create or replace function public.reserve_ticket_inventory(p_ticket_id uuid, p_qty integer)
returns setof public.ticket_inventory
language plpgsql
as $$
declare
  ticket_row public.ticket_inventory%rowtype;
  requested_qty integer := greatest(coalesce(p_qty, 0), 0);
begin
  if requested_qty <= 0 then
    raise exception 'Requested quantity must be greater than zero';
  end if;

  select * into ticket_row
  from public.ticket_inventory
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'Ticket not found';
  end if;

  if ticket_row.booking_enabled is false then
    raise exception 'Ticket booking is disabled';
  end if;

  if ticket_row.status <> 'OPEN' then
    raise exception 'Ticket is not open for booking';
  end if;

  if requested_qty > greatest(ticket_row.booking_limit, 1) then
    raise exception 'Requested quantity exceeds booking limit';
  end if;

  if ticket_row.available_seats < requested_qty then
    raise exception 'Not enough seats available';
  end if;

  update public.ticket_inventory
  set
    available_seats = ticket_row.available_seats - requested_qty,
    booked_seats = ticket_row.booked_seats + requested_qty,
    status = case
      when ticket_row.available_seats - requested_qty <= 0 then 'SOLD_OUT'
      else ticket_row.status
    end,
    updated_at = now()
  where id = p_ticket_id
  returning * into ticket_row;

  return next ticket_row;
end;
$$;

create or replace function public.release_ticket_inventory(p_ticket_id uuid, p_qty integer)
returns setof public.ticket_inventory
language plpgsql
as $$
declare
  ticket_row public.ticket_inventory%rowtype;
  released_qty integer := greatest(coalesce(p_qty, 0), 0);
begin
  if released_qty <= 0 then
    raise exception 'Release quantity must be greater than zero';
  end if;

  select * into ticket_row
  from public.ticket_inventory
  where id = p_ticket_id
  for update;

  if not found then
    raise exception 'Ticket not found';
  end if;

  update public.ticket_inventory
  set
    booked_seats = greatest(ticket_row.booked_seats - released_qty, 0),
    available_seats = least(ticket_row.available_seats + released_qty, ticket_row.total_seats),
    status = case
      when ticket_row.status = 'SOLD_OUT' and ticket_row.available_seats + released_qty > 0 then 'OPEN'
      else ticket_row.status
    end,
    updated_at = now()
  where id = p_ticket_id
  returning * into ticket_row;

  return next ticket_row;
end;
$$;
