-- SafeSphere — run this entire file in the Supabase SQL Editor.
-- Requires: Supabase project with Phone Auth enabled (Twilio provider in Auth settings).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users — phone comes from Supabase Auth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone_number text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'App user profile; id matches auth.users.id';

-- Auto-create profile when a user signs up via phone OTP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone_number)
  values (new.id, new.phone)
  on conflict (id) do update set phone_number = excluded.phone_number;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- trusted_contacts
-- ---------------------------------------------------------------------------
create table public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone_number text not null,
  created_at timestamptz not null default now()
);

create index trusted_contacts_user_id_idx on public.trusted_contacts (user_id);

-- ---------------------------------------------------------------------------
-- incident_reports
-- ---------------------------------------------------------------------------
create table public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  location extensions.geography (point, 4326) not null,
  type text not null,
  note text,
  created_at timestamptz not null default now()
);

create index incident_reports_location_idx
  on public.incident_reports using gist (location);

-- ---------------------------------------------------------------------------
-- vibe_tags
-- ---------------------------------------------------------------------------
create table public.vibe_tags (
  id uuid primary key default gen_random_uuid(),
  location extensions.geography (point, 4326) not null,
  tag text not null,
  created_at timestamptz not null default now()
);

create index vibe_tags_location_idx on public.vibe_tags using gist (location);

-- ---------------------------------------------------------------------------
-- sos_events
-- ---------------------------------------------------------------------------
create table public.sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  location extensions.geography (point, 4326) not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sos_events_user_id_idx on public.sos_events (user_id);
create index sos_events_location_idx on public.sos_events using gist (location);

create or replace function public.set_sos_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sos_events_updated_at
  before update on public.sos_events
  for each row execute function public.set_sos_events_updated_at();

-- ---------------------------------------------------------------------------
-- Helper RPCs — geography in DB, lat/lng at the API boundary
-- ---------------------------------------------------------------------------

-- Insert SOS event; returns the new row id
create or replace function public.create_sos_event(
  p_user_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_status text default 'active'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  insert into public.sos_events (user_id, location, status)
  values (
    p_user_id,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    coalesce(p_status, 'active')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Read SOS event with extracted coordinates (for tracking page + Realtime refresh)
create or replace function public.get_sos_event(p_id uuid)
returns table (
  id uuid,
  user_id uuid,
  lat double precision,
  lng double precision,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    s.id,
    s.user_id,
    st_y(s.location::geometry) as lat,
    st_x(s.location::geometry) as lng,
    s.status,
    s.created_at,
    s.updated_at
  from public.sos_events s
  where s.id = p_id;
$$;

-- Update location during live tracking
create or replace function public.update_sos_location(
  p_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.sos_events
  set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  where id = p_id;
end;
$$;

-- Generic point insert helpers for teammate features
create or replace function public.create_incident_report(
  p_lat double precision,
  p_lng double precision,
  p_type text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  insert into public.incident_reports (location, type, note)
  values (
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    p_type,
    p_note
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.create_vibe_tag(
  p_lat double precision,
  p_lng double precision,
  p_tag text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  insert into public.vibe_tags (location, tag)
  values (
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    p_tag
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.incident_reports enable row level security;
alter table public.vibe_tags enable row level security;
alter table public.sos_events enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- trusted_contacts
create policy "Users can view own trusted contacts"
  on public.trusted_contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own trusted contacts"
  on public.trusted_contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own trusted contacts"
  on public.trusted_contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own trusted contacts"
  on public.trusted_contacts for delete
  using (auth.uid() = user_id);

-- incident_reports — public read for map; authenticated insert
create policy "Anyone can read incident reports"
  on public.incident_reports for select
  using (true);

create policy "Authenticated users can create incident reports"
  on public.incident_reports for insert
  with check (auth.uid() is not null);

-- vibe_tags — public read for map; authenticated insert
create policy "Anyone can read vibe tags"
  on public.vibe_tags for select
  using (true);

create policy "Authenticated users can create vibe tags"
  on public.vibe_tags for insert
  with check (auth.uid() is not null);

-- sos_events — public read for unauthenticated tracking links
create policy "Anyone can view sos events"
  on public.sos_events for select
  using (true);

create policy "Authenticated users can create sos events"
  on public.sos_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sos events"
  on public.sos_events for update
  using (auth.uid() = user_id);

-- Grant execute on RPCs
grant execute on function public.create_sos_event(uuid, double precision, double precision, text) to anon, authenticated, service_role;
grant execute on function public.get_sos_event(uuid) to anon, authenticated, service_role;
grant execute on function public.update_sos_location(uuid, double precision, double precision) to anon, authenticated, service_role;
grant execute on function public.create_incident_report(double precision, double precision, text, text) to authenticated, service_role;
grant execute on function public.create_vibe_tag(double precision, double precision, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime — live tracking on sos_events
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.sos_events;
