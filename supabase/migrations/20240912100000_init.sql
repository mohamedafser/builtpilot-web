-- BuildPilot initial schema, RLS, and auth profile trigger.
-- Run this in the Supabase SQL editor or via the Supabase CLI.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'member');
create type public.project_status as enum (
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  client_name text,
  location text,
  estimated_budget numeric(14, 2),
  status public.project_status not null default 'planning',
  start_date date,
  expected_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_budget_non_negative check (
    estimated_budget is null or estimated_budget >= 0
  ),
  constraint projects_dates_ordered check (
    start_date is null
    or expected_end_date is null
    or expected_end_date >= start_date
  )
);

create index businesses_owner_id_idx on public.businesses (owner_id);
create index business_members_business_id_idx on public.business_members (business_id);
create index business_members_user_id_idx on public.business_members (user_id);
create index projects_business_id_idx on public.projects (business_id);
create index projects_status_idx on public.projects (status);
create index projects_created_at_idx on public.projects (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Create a profile, default business, and owner membership on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  display_name text;
  business_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  business_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    display_name || '''s Business'
  );

  insert into public.profiles (id, full_name)
  values (new.id, display_name);

  insert into public.businesses (name, owner_id)
  values (business_name, new.id)
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = target_business_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_business_role(
  target_business_id uuid,
  allowed_roles public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = target_business_id
      and user_id = auth.uid()
      and role = any (allowed_roles)
  );
$$;

create or replace function public.can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_user_id = auth.uid()
    or exists (
      select 1
      from public.business_members viewer
      join public.business_members peer
        on peer.business_id = viewer.business_id
      where viewer.user_id = auth.uid()
        and peer.user_id = target_user_id
    );
$$;

revoke all on function public.is_business_member(uuid) from public, anon;
revoke all on function public.has_business_role(uuid, public.member_role[]) from public, anon;
revoke all on function public.can_view_profile(uuid) from public, anon;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.has_business_role(uuid, public.member_role[]) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.projects enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.businesses from anon;
revoke all on table public.business_members from anon;
revoke all on table public.projects from anon;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.business_members to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;

create policy "Users can view profiles in their businesses"
  on public.profiles
  for select
  to authenticated
  using (public.can_view_profile(id));

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Members can view their businesses"
  on public.businesses
  for select
  to authenticated
  using (public.is_business_member(id));

create policy "Owners can create businesses"
  on public.businesses
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners and admins can update their businesses"
  on public.businesses
  for update
  to authenticated
  using (public.has_business_role(id, array['owner', 'admin']::public.member_role[]))
  with check (public.has_business_role(id, array['owner', 'admin']::public.member_role[]));

create policy "Owners can delete their businesses"
  on public.businesses
  for delete
  to authenticated
  using (public.has_business_role(id, array['owner']::public.member_role[]));

create policy "Members can view business memberships"
  on public.business_members
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Owners and admins can add members"
  on public.business_members
  for insert
  to authenticated
  with check (
    public.has_business_role(business_id, array['owner', 'admin']::public.member_role[])
  );

create policy "Owners and admins can update members"
  on public.business_members
  for update
  to authenticated
  using (
    public.has_business_role(business_id, array['owner', 'admin']::public.member_role[])
  )
  with check (
    public.has_business_role(business_id, array['owner', 'admin']::public.member_role[])
  );

create policy "Owners and admins can remove members"
  on public.business_members
  for delete
  to authenticated
  using (
    public.has_business_role(business_id, array['owner', 'admin']::public.member_role[])
  );

create policy "Members can view business projects"
  on public.projects
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create business projects"
  on public.projects
  for insert
  to authenticated
  with check (public.is_business_member(business_id));

create policy "Members can update business projects"
  on public.projects
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Owners and admins can delete business projects"
  on public.projects
  for delete
  to authenticated
  using (
    public.has_business_role(business_id, array['owner', 'admin']::public.member_role[])
  );

-- Users who signed up before this migration still need a workspace.
do $$
declare
  existing_user record;
  new_business_id uuid;
  display_name text;
  business_name text;
begin
  for existing_user in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    display_name := coalesce(
      nullif(trim(existing_user.raw_user_meta_data ->> 'full_name'), ''),
      split_part(existing_user.email, '@', 1)
    );
    business_name := coalesce(
      nullif(trim(existing_user.raw_user_meta_data ->> 'business_name'), ''),
      display_name || '''s Business'
    );

    insert into public.profiles (id, full_name)
    values (existing_user.id, display_name);

    insert into public.businesses (name, owner_id)
    values (business_name, existing_user.id)
    returning id into new_business_id;

    insert into public.business_members (business_id, user_id, role)
    values (new_business_id, existing_user.id, 'owner');
  end loop;
end;
$$;

notify pgrst, 'reload schema';
