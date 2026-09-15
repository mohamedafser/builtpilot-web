-- BuildPilot Phase 4: workers, project assignments, daily attendance,
-- and labour cost. Run after 20240912140000_daily_site_diary.sql.
-- Daily report manpower snapshots stay unchanged.

create type public.worker_role as enum (
  'mason',
  'helper',
  'carpenter',
  'electrician',
  'plumber',
  'painter',
  'welder',
  'operator',
  'supervisor',
  'other'
);

create type public.worker_status as enum ('active', 'inactive');

create type public.project_worker_status as enum ('active', 'inactive');

create type public.attendance_status as enum ('present', 'absent', 'half_day');

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  role public.worker_role not null,
  daily_wage numeric(12, 2) not null,
  status public.worker_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workers_name_present check (char_length(trim(name)) >= 2),
  constraint workers_daily_wage_non_negative check (daily_wage >= 0)
);

create table public.project_workers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete restrict,
  business_id uuid not null references public.businesses (id) on delete cascade,
  assigned_from date not null default current_date,
  assigned_until date,
  status public.project_worker_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint project_workers_unique_assignment unique (project_id, worker_id),
  constraint project_workers_dates_ordered check (
    assigned_until is null or assigned_until >= assigned_from
  )
);

create table public.worker_attendance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete restrict,
  attendance_date date not null,
  status public.attendance_status not null,
  hours_worked numeric(5, 2),
  wage numeric(12, 2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_attendance_unique_day unique (
    project_id,
    worker_id,
    attendance_date
  ),
  constraint worker_attendance_hours_range check (
    hours_worked is null
    or (hours_worked >= 0 and hours_worked <= 24)
  ),
  constraint worker_attendance_wage_non_negative check (wage >= 0)
);

create index workers_business_id_idx on public.workers (business_id);
create index workers_status_idx on public.workers (status);
create index workers_role_idx on public.workers (role);
create index workers_business_status_idx on public.workers (business_id, status);
create index workers_name_idx on public.workers (business_id, name);

create index project_workers_project_id_idx on public.project_workers (project_id);
create index project_workers_worker_id_idx on public.project_workers (worker_id);
create index project_workers_business_id_idx on public.project_workers (business_id);
create index project_workers_status_idx on public.project_workers (status);
create index project_workers_project_status_idx
  on public.project_workers (project_id, status);

create index worker_attendance_business_id_idx
  on public.worker_attendance (business_id);
create index worker_attendance_project_id_idx
  on public.worker_attendance (project_id);
create index worker_attendance_worker_id_idx
  on public.worker_attendance (worker_id);
create index worker_attendance_date_idx
  on public.worker_attendance (attendance_date desc);
create index worker_attendance_project_date_idx
  on public.worker_attendance (project_id, attendance_date desc);
create index worker_attendance_business_date_idx
  on public.worker_attendance (business_id, attendance_date desc);

create trigger set_workers_updated_at
  before update on public.workers
  for each row execute function public.set_updated_at();

create trigger set_worker_attendance_updated_at
  before update on public.worker_attendance
  for each row execute function public.set_updated_at();

create or replace function public.prevent_worker_business_change()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id then
    raise exception 'Cannot move a worker to another business';
  end if;

  return new;
end;
$$;

create trigger prevent_worker_business_change
  before update on public.workers
  for each row
  execute function public.prevent_worker_business_change();

create or replace function public.prevent_project_worker_scope_change()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is distinct from old.project_id
     or new.worker_id is distinct from old.worker_id
     or new.business_id is distinct from old.business_id then
    raise exception 'Cannot change project worker assignment scope';
  end if;

  return new;
end;
$$;

create trigger prevent_project_worker_scope_change
  before update on public.project_workers
  for each row
  execute function public.prevent_project_worker_scope_change();

create or replace function public.prevent_attendance_scope_change()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.project_id is distinct from old.project_id
     or new.worker_id is distinct from old.worker_id then
    raise exception 'Cannot change attendance business, project, or worker';
  end if;

  return new;
end;
$$;

create trigger prevent_attendance_scope_change
  before update on public.worker_attendance
  for each row
  execute function public.prevent_attendance_scope_change();

create or replace function public.worker_belongs_to_business(
  target_worker_id uuid,
  target_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workers
    where id = target_worker_id
      and business_id = target_business_id
  );
$$;

create or replace function public.assignment_matches_scope(
  target_project_id uuid,
  target_worker_id uuid,
  target_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.project_belongs_to_business(target_project_id, target_business_id)
    and public.worker_belongs_to_business(target_worker_id, target_business_id);
$$;

revoke all on function public.worker_belongs_to_business(uuid, uuid)
  from public, anon;
revoke all on function public.assignment_matches_scope(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.worker_belongs_to_business(uuid, uuid)
  to authenticated;
grant execute on function public.assignment_matches_scope(uuid, uuid, uuid)
  to authenticated;

alter table public.workers enable row level security;
alter table public.project_workers enable row level security;
alter table public.worker_attendance enable row level security;

revoke all on table public.workers from anon;
revoke all on table public.project_workers from anon;
revoke all on table public.worker_attendance from anon;

grant select, insert, update on table public.workers to authenticated;
grant select, insert, update, delete on table public.project_workers
  to authenticated;
grant select, insert, update on table public.worker_attendance
  to authenticated;

create policy "Members can view business workers"
  on public.workers
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create business workers"
  on public.workers
  for insert
  to authenticated
  with check (public.is_business_member(business_id));

create policy "Members can update business workers"
  on public.workers
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Members can view project worker assignments"
  on public.project_workers
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create project worker assignments"
  on public.project_workers
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and public.assignment_matches_scope(project_id, worker_id, business_id)
  );

create policy "Members can update project worker assignments"
  on public.project_workers
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.assignment_matches_scope(project_id, worker_id, business_id)
  );

create policy "Members can delete project worker assignments"
  on public.project_workers
  for delete
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can view worker attendance"
  on public.worker_attendance
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create worker attendance"
  on public.worker_attendance
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and public.assignment_matches_scope(project_id, worker_id, business_id)
  );

create policy "Members can update worker attendance"
  on public.worker_attendance
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.assignment_matches_scope(project_id, worker_id, business_id)
  );

notify pgrst, 'reload schema';
