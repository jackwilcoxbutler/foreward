-- V1.1: authenticated ownership, archive-ready profiles, privacy, and saved courses.
-- Existing anonymous rounds remain valid because rounds.user_id is nullable.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'premium')),
  subscription_status text not null default 'inactive',
  subscription_period_end timestamptz,
  entitlements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute procedure public.create_profile_for_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create table if not exists public.saved_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_source text not null check (course_source in ('opengolfapi', 'custom')),
  external_course_id text,
  name text not null,
  layout_name text,
  city text,
  state text,
  tee_name text,
  source_license text not null default 'ODbL-1.0',
  holes jsonb not null,
  is_favorite boolean not null default false,
  is_custom boolean not null default false,
  last_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_courses_name_length check (char_length(name) between 1 and 180),
  constraint saved_courses_hole_count check (jsonb_array_length(holes) in (9, 18)),
  constraint saved_courses_external_source check (
    (is_custom and course_source = 'custom' and external_course_id is null)
    or (not is_custom and course_source = 'opengolfapi' and external_course_id is not null)
  )
);

create unique index if not exists saved_courses_user_external_idx
  on public.saved_courses (user_id, external_course_id)
  where external_course_id is not null;
create index if not exists saved_courses_user_favorites_idx
  on public.saved_courses (user_id, is_favorite desc, updated_at desc);
create index if not exists saved_courses_user_recent_idx
  on public.saved_courses (user_id, last_played_at desc)
  where last_played_at is not null;

alter table public.rounds
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists is_public boolean not null default true,
  add column if not exists saved_course_id uuid references public.saved_courses(id) on delete set null;

alter table public.rounds drop constraint if exists rounds_course_source_check;
alter table public.rounds add constraint rounds_course_source_check
  check (course_source in ('opengolfapi', 'manual', 'custom'));

create index if not exists rounds_user_played_at_idx
  on public.rounds (user_id, played_at desc, created_at desc);
create index if not exists rounds_public_share_idx
  on public.rounds (share_id) where is_public;

alter table public.profiles enable row level security;
alter table public.saved_courses enable row level security;

-- Application data continues through authenticated server routes using the
-- service-role key. Supabase Auth itself uses the browser-safe anon key.
--deploy
