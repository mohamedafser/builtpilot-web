-- BuildPilot project management: extra project fields, archive support,
-- indexes, and membership-scoped RLS. Run after 20240912100000_init.sql.

alter table public.projects
  add column if not exists client_phone text,
  add column if not exists client_email text,
  add column if not exists description text,
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_client_email_format'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_client_email_format
      check (
        client_email is null
        or client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      );
  end if;
end
$$;

create index if not exists projects_business_id_idx
  on public.projects (business_id);
create index if not exists projects_status_idx
  on public.projects (status);
create index if not exists projects_created_at_idx
  on public.projects (created_at desc);
create index if not exists projects_archived_at_idx
  on public.projects (archived_at);
create index if not exists projects_business_updated_at_idx
  on public.projects (business_id, updated_at desc);
create index if not exists projects_business_archived_at_idx
  on public.projects (business_id, archived_at);

create or replace function public.prevent_project_business_change()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id then
    raise exception 'Cannot move a project to another business';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_project_business_change on public.projects;
create trigger prevent_project_business_change
  before update on public.projects
  for each row
  execute function public.prevent_project_business_change();

alter table public.projects enable row level security;

revoke all on table public.projects from anon;
grant select, insert, update, delete on table public.projects to authenticated;

drop policy if exists "Members can view business projects" on public.projects;
drop policy if exists "Members can create business projects" on public.projects;
drop policy if exists "Members can update business projects" on public.projects;
drop policy if exists "Owners and admins can delete business projects" on public.projects;

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
    public.has_business_role(
      business_id,
      array['owner', 'admin']::public.member_role[]
    )
  );

notify pgrst, 'reload schema';
