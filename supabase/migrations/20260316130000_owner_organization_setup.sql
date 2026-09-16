-- Owner organization setup: extended roles, deferred business creation, invitations.

alter type public.member_role add value if not exists 'project_manager';
alter type public.member_role add value if not exists 'engineer';
alter type public.member_role add value if not exists 'site_supervisor';
alter type public.member_role add value if not exists 'worker';

alter table public.businesses
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

update public.businesses
set created_by = owner_id
where created_by is null;

create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  role public.member_role not null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint business_invitations_role_not_owner check (role <> 'owner'),
  constraint business_invitations_email_lowercase check (email = lower(trim(email)))
);

create unique index if not exists business_invitations_pending_email_idx
  on public.business_invitations (business_id, email)
  where accepted_at is null;

create index if not exists business_invitations_email_idx
  on public.business_invitations (email);

-- Profile only on signup; business is created after email verification.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  language_code text;
begin
  display_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');

  language_code := lower(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'language'), ''),
    'en'
  ));

  if language_code not in ('en', 'ta', 'ar', 'hi') then
    language_code := 'en';
  end if;

  insert into public.profiles (id, full_name, language)
  values (
    new.id,
    coalesce(display_name, split_part(new.email, '@', 1)),
    language_code
  )
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    language = excluded.language;

  return new;
end;
$$;

create or replace function public.enforce_business_member_role_rules()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'owner'
      and current_setting('app.allow_owner_assignment', true) is distinct from 'true'
    then
      raise exception 'Owner role cannot be assigned through invitations';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role = 'owner'
      and old.role is distinct from 'owner'
      and current_setting('app.allow_owner_transfer', true) is distinct from 'true'
    then
      raise exception 'Owner role cannot be assigned through member updates';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists business_members_enforce_role_rules on public.business_members;
create trigger business_members_enforce_role_rules
  before insert or update on public.business_members
  for each row execute function public.enforce_business_member_role_rules();

create or replace function public.setup_owner_business(
  target_user_id uuid,
  target_business_name text,
  target_country_code text default 'IN',
  target_language text default 'en'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  country text;
  currency text;
  lang text;
  cleaned_name text;
begin
  if exists (
    select 1
    from public.business_members
    where user_id = target_user_id
  ) then
    select bm.business_id
    into new_business_id
    from public.business_members bm
    where bm.user_id = target_user_id
    order by bm.created_at asc
    limit 1;

    return new_business_id;
  end if;

  cleaned_name := coalesce(nullif(trim(target_business_name), ''), 'My Business');
  country := upper(coalesce(nullif(trim(target_country_code), ''), 'IN'));

  if country not in ('IN', 'AE') then
    country := 'IN';
  end if;

  currency := public.currency_for_country(country);

  lang := lower(coalesce(nullif(trim(target_language), ''), 'en'));
  if lang not in ('en', 'ta', 'ar', 'hi') then
    lang := 'en';
  end if;

  update public.profiles
  set language = lang
  where id = target_user_id;

  perform set_config('app.allow_owner_assignment', 'true', true);

  insert into public.businesses (name, owner_id, created_by, country_code, currency_code)
  values (cleaned_name, target_user_id, target_user_id, country, currency)
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, target_user_id, 'owner');

  perform set_config('app.allow_owner_assignment', 'false', true);

  perform public.seed_default_materials_for_business(new_business_id, country);

  return new_business_id;
end;
$$;

revoke all on function public.setup_owner_business(uuid, text, text, text) from public;
grant execute on function public.setup_owner_business(uuid, text, text, text) to service_role;

alter table public.business_invitations enable row level security;

revoke all on table public.business_invitations from anon;
grant select, insert, update, delete on table public.business_invitations to authenticated;

create policy "Members can view business invitations"
  on public.business_invitations
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Owners and admins can manage invitations"
  on public.business_invitations
  for all
  to authenticated
  using (
    public.has_business_role(business_id, array['owner', 'admin']::public.member_role[])
  )
  with check (
    public.has_business_role(business_id, array['owner', 'admin']::public.member_role[])
    and role <> 'owner'
  );

notify pgrst, 'reload schema';
