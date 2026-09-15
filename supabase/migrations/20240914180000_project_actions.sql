-- Project next-step / pending actions.
-- Persisted workflow indicators (not toast notifications).
-- Run after 20240914170000_default_materials.sql.

create type public.project_action_type as enum (
  'material',
  'labour',
  'quotation',
  'payment',
  'task',
  'inspection'
);

create type public.project_action_status as enum (
  'pending',
  'completed',
  'dismissed'
);

create table public.project_actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  type public.project_action_type not null,
  action_key text not null,
  title text not null,
  description text,
  status public.project_action_status not null default 'pending',
  reference_id uuid,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  completed_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_actions_action_key_present check (
    char_length(trim(action_key)) between 2 and 80
  ),
  constraint project_actions_title_present check (
    char_length(trim(title)) between 2 and 160
  ),
  constraint project_actions_description_length check (
    description is null or char_length(description) <= 500
  ),
  constraint project_actions_href_length check (
    href is null or char_length(href) <= 500
  ),
  constraint project_actions_completed_consistency check (
    (
      status = 'pending'
      and completed_at is null
      and completed_by is null
    )
    or (
      status in ('completed', 'dismissed')
      and completed_at is not null
    )
  )
);

comment on table public.project_actions is
  'Persisted next-step / pending actions for projects. Distinct from ephemeral toasts and read-state notifications.';

create unique index project_actions_pending_with_ref_uidx
  on public.project_actions (project_id, action_key, reference_id)
  where status = 'pending' and reference_id is not null;

create unique index project_actions_pending_without_ref_uidx
  on public.project_actions (project_id, action_key)
  where status = 'pending' and reference_id is null;

create index project_actions_project_pending_idx
  on public.project_actions (project_id, created_at desc)
  where status = 'pending';

create index project_actions_business_pending_idx
  on public.project_actions (business_id, created_at desc)
  where status = 'pending';

create index project_actions_project_status_idx
  on public.project_actions (project_id, status, created_at desc);

create or replace function public.set_project_actions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger project_actions_set_updated_at
  before update on public.project_actions
  for each row
  execute function public.set_project_actions_updated_at();

create or replace function public.prevent_project_action_scope_mismatch()
returns trigger
language plpgsql
as $$
declare
  project_business uuid;
begin
  select p.business_id into project_business
  from public.projects p
  where p.id = new.project_id;

  if project_business is null then
    raise exception 'Project not found for project action.';
  end if;

  if project_business <> new.business_id then
    raise exception 'Project action business_id must match the project.';
  end if;

  return new;
end;
$$;

create trigger project_actions_scope_check
  before insert or update of business_id, project_id on public.project_actions
  for each row
  execute function public.prevent_project_action_scope_mismatch();

alter table public.project_actions enable row level security;

create policy "Members can view project actions"
  on public.project_actions
  for select
  using (public.is_business_member(business_id));

create policy "Members can insert project actions"
  on public.project_actions
  for insert
  with check (public.is_business_member(business_id));

create policy "Members can update project actions"
  on public.project_actions
  for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
