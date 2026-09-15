-- BuildPilot Phase 8: BOQ and measurements.
-- Run after 20240913182000_quotation_item_workers.sql.
-- BOQ values are estimates and progress. Actual project cost stays in
-- labour attendance, material transactions, and project expenses.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'boq_status'
  ) then
    create type public.boq_status as enum (
      'draft',
      'active',
      'completed',
      'archived'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'boq_item_type'
  ) then
    create type public.boq_item_type as enum (
      'material',
      'labour',
      'equipment',
      'work',
      'other'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'boq_unit'
  ) then
    create type public.boq_unit as enum (
      'sq_ft',
      'sq_m',
      'cubic_ft',
      'cubic_m',
      'meter',
      'kg',
      'ton',
      'bag',
      'piece',
      'day',
      'hour',
      'liter',
      'lot',
      'other'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'boq_measurement_status'
  ) then
    create type public.boq_measurement_status as enum (
      'active',
      'void'
    );
  end if;
end $$;

create table public.boqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  description text,
  status public.boq_status not null default 'draft',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boqs_name_present check (char_length(trim(name)) >= 2)
);

create table public.boq_sections (
  id uuid primary key default gen_random_uuid(),
  boq_id uuid not null references public.boqs (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boq_sections_name_present check (char_length(trim(name)) >= 1),
  constraint boq_sections_sort_order_non_negative check (sort_order >= 0)
);

create table public.boq_items (
  id uuid primary key default gen_random_uuid(),
  boq_id uuid not null references public.boqs (id) on delete cascade,
  section_id uuid references public.boq_sections (id) on delete restrict,
  business_id uuid not null references public.businesses (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  item_code text,
  description text not null,
  item_type public.boq_item_type not null,
  unit public.boq_unit not null,
  estimated_quantity numeric(14, 3) not null,
  rate numeric(14, 2) not null,
  estimated_amount numeric(14, 2) not null,
  completed_quantity numeric(14, 3) not null default 0,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boq_items_description_present check (
    char_length(trim(description)) >= 1
  ),
  constraint boq_items_item_code_length check (
    item_code is null or char_length(trim(item_code)) >= 1
  ),
  constraint boq_items_estimated_quantity_positive check (
    estimated_quantity > 0
  ),
  constraint boq_items_rate_non_negative check (rate >= 0),
  constraint boq_items_estimated_amount_non_negative check (
    estimated_amount >= 0
  ),
  constraint boq_items_completed_quantity_non_negative check (
    completed_quantity >= 0
  ),
  constraint boq_items_completed_not_over_estimated check (
    completed_quantity <= estimated_quantity
  ),
  constraint boq_items_sort_order_non_negative check (sort_order >= 0),
  constraint boq_items_material_optional check (
    material_id is null or item_type = 'material'
  )
);

create table public.boq_measurements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  boq_id uuid not null references public.boqs (id) on delete cascade,
  boq_item_id uuid not null references public.boq_items (id) on delete restrict,
  measurement_date date not null,
  description text,
  quantity numeric(14, 3) not null,
  unit public.boq_unit not null,
  location text,
  reference text,
  notes text,
  status public.boq_measurement_status not null default 'active',
  measured_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint boq_measurements_quantity_positive check (quantity > 0),
  constraint boq_measurements_location_length check (
    location is null or char_length(trim(location)) >= 1
  ),
  constraint boq_measurements_reference_length check (
    reference is null or char_length(trim(reference)) >= 1
  )
);

create index boqs_business_id_idx on public.boqs (business_id);
create index boqs_project_id_idx on public.boqs (project_id);
create index boqs_status_idx on public.boqs (status);
create index boqs_business_status_idx on public.boqs (business_id, status);
create index boqs_project_created_idx on public.boqs (project_id, created_at desc);

create index boq_sections_boq_id_idx on public.boq_sections (boq_id);
create index boq_sections_business_id_idx on public.boq_sections (business_id);
create index boq_sections_sort_order_idx
  on public.boq_sections (boq_id, sort_order);

create index boq_items_boq_id_idx on public.boq_items (boq_id);
create index boq_items_section_id_idx on public.boq_items (section_id);
create index boq_items_business_id_idx on public.boq_items (business_id);
create index boq_items_item_type_idx on public.boq_items (item_type);
create index boq_items_material_id_idx on public.boq_items (material_id);
create index boq_items_sort_order_idx
  on public.boq_items (boq_id, section_id, sort_order);

create index boq_measurements_project_id_idx
  on public.boq_measurements (project_id);
create index boq_measurements_boq_id_idx on public.boq_measurements (boq_id);
create index boq_measurements_boq_item_id_idx
  on public.boq_measurements (boq_item_id);
create index boq_measurements_measurement_date_idx
  on public.boq_measurements (measurement_date desc);
create index boq_measurements_business_id_idx
  on public.boq_measurements (business_id);
create index boq_measurements_status_idx on public.boq_measurements (status);
create index boq_measurements_item_status_idx
  on public.boq_measurements (boq_item_id, status);
create index boq_measurements_project_date_idx
  on public.boq_measurements (project_id, measurement_date desc);

create trigger set_boqs_updated_at
  before update on public.boqs
  for each row execute function public.set_updated_at();

create trigger set_boq_sections_updated_at
  before update on public.boq_sections
  for each row execute function public.set_updated_at();

create trigger set_boq_items_updated_at
  before update on public.boq_items
  for each row execute function public.set_updated_at();

create or replace function public.boq_belongs_to_business(
  target_boq_id uuid,
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
    from public.boqs b
    where b.id = target_boq_id
      and b.business_id = target_business_id
  );
$$;

create or replace function public.boq_section_belongs_to_business(
  target_section_id uuid,
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
    from public.boq_sections s
    where s.id = target_section_id
      and s.business_id = target_business_id
  );
$$;

create or replace function public.boq_item_belongs_to_business(
  target_item_id uuid,
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
    from public.boq_items i
    where i.id = target_item_id
      and i.business_id = target_business_id
  );
$$;

create or replace function public.boq_summaries(target_project_id uuid)
returns table (
  boq_id uuid,
  item_count bigint,
  estimated_value numeric,
  completed_value numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_business_id uuid;
begin
  select p.business_id
    into target_business_id
  from public.projects p
  where p.id = target_project_id;

  if target_business_id is null
     or not public.is_business_member(target_business_id)
     or not public.project_belongs_to_business(
       target_project_id,
       target_business_id
     ) then
    return;
  end if;

  return query
  select
    b.id,
    count(i.id)::bigint,
    coalesce(sum(i.estimated_amount), 0),
    coalesce(sum(round(i.completed_quantity * i.rate, 2)), 0)
  from public.boqs b
  left join public.boq_items i
    on i.boq_id = b.id
   and i.business_id = b.business_id
  where b.project_id = target_project_id
    and b.business_id = target_business_id
  group by b.id;
end;
$$;

create or replace function public.sync_boq_item_completed_quantity(
  target_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('buildpilot.syncing_boq_qty', '1', true);

  update public.boq_items
  set completed_quantity = coalesce((
    select sum(m.quantity)
    from public.boq_measurements m
    where m.boq_item_id = target_item_id
      and m.status = 'active'
  ), 0)
  where id = target_item_id;
end;
$$;

create or replace function public.prevent_boq_illegal_update()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.project_id is distinct from old.project_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Cannot change BOQ business, project, or creator';
  end if;

  if old.status = 'archived' and new.status is distinct from old.status then
    raise exception 'Archived BOQs cannot change status';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'draft' and new.status not in ('active', 'archived') then
      raise exception 'Invalid BOQ status change';
    end if;

    if old.status = 'active'
       and new.status not in ('completed', 'archived') then
      raise exception 'Invalid BOQ status change';
    end if;

    if old.status = 'completed' and new.status is distinct from 'archived' then
      raise exception 'Invalid BOQ status change';
    end if;
  end if;

  return new;
end;
$$;

create trigger prevent_boq_illegal_update
  before update on public.boqs
  for each row
  execute function public.prevent_boq_illegal_update();

create or replace function public.prevent_boq_scope_mismatch()
returns trigger
language plpgsql
as $$
begin
  if not public.project_belongs_to_business(new.project_id, new.business_id) then
    raise exception 'BOQ project must belong to the same business';
  end if;

  return new;
end;
$$;

create trigger prevent_boq_scope_mismatch
  before insert or update on public.boqs
  for each row
  execute function public.prevent_boq_scope_mismatch();

create or replace function public.prevent_boq_section_scope_mismatch()
returns trigger
language plpgsql
as $$
declare
  parent_boq public.boqs%rowtype;
begin
  select *
    into parent_boq
  from public.boqs
  where id = new.boq_id;

  if parent_boq.id is null
     or parent_boq.business_id is distinct from new.business_id then
    raise exception 'BOQ section must belong to the same business';
  end if;

  if parent_boq.status not in ('draft', 'active') then
    raise exception 'Only draft or active BOQs can change sections';
  end if;

  return new;
end;
$$;

create trigger prevent_boq_section_scope_mismatch
  before insert or update on public.boq_sections
  for each row
  execute function public.prevent_boq_section_scope_mismatch();

create or replace function public.prevent_boq_section_delete_when_locked()
returns trigger
language plpgsql
as $$
declare
  parent_status public.boq_status;
begin
  select status
    into parent_status
  from public.boqs
  where id = old.boq_id;

  if parent_status not in ('draft', 'active') then
    raise exception 'Only draft or active BOQs can change sections';
  end if;

  if exists (
    select 1
    from public.boq_items i
    where i.section_id = old.id
  ) then
    raise exception 'Cannot delete a section that still has BOQ items';
  end if;

  return old;
end;
$$;

create trigger prevent_boq_section_delete_when_locked
  before delete on public.boq_sections
  for each row
  execute function public.prevent_boq_section_delete_when_locked();

create or replace function public.prevent_boq_item_scope_mismatch()
returns trigger
language plpgsql
as $$
declare
  parent_boq public.boqs%rowtype;
  parent_section public.boq_sections%rowtype;
begin
  select *
    into parent_boq
  from public.boqs
  where id = new.boq_id;

  if parent_boq.id is null
     or parent_boq.business_id is distinct from new.business_id then
    raise exception 'BOQ item must belong to the same business';
  end if;

  if parent_boq.status not in ('draft', 'active') then
    raise exception 'Only draft or active BOQs can change items';
  end if;

  if new.section_id is not null then
    select *
      into parent_section
    from public.boq_sections
    where id = new.section_id;

    if parent_section.id is null
       or parent_section.boq_id is distinct from new.boq_id
       or parent_section.business_id is distinct from new.business_id then
      raise exception 'BOQ section must belong to the same BOQ';
    end if;
  end if;

  if new.material_id is not null
     and not public.material_belongs_to_business(
       new.material_id,
       new.business_id
     ) then
    raise exception 'BOQ material must belong to the same business';
  end if;

  new.estimated_amount := round(new.estimated_quantity * new.rate, 2);

  if tg_op = 'INSERT' then
    new.completed_quantity := 0;
  elsif current_setting('buildpilot.syncing_boq_qty', true) is distinct from '1' then
    new.completed_quantity := old.completed_quantity;
  end if;

  if new.estimated_quantity < new.completed_quantity then
    raise exception 'Estimated quantity cannot be less than completed quantity';
  end if;

  if tg_op = 'UPDATE'
     and new.unit is distinct from old.unit
     and exists (
       select 1
       from public.boq_measurements m
       where m.boq_item_id = old.id
     ) then
    raise exception 'Cannot change the unit of a BOQ item that has measurements';
  end if;

  return new;
end;
$$;

create trigger prevent_boq_item_scope_mismatch
  before insert or update on public.boq_items
  for each row
  execute function public.prevent_boq_item_scope_mismatch();

create or replace function public.prevent_boq_item_delete_when_locked()
returns trigger
language plpgsql
as $$
declare
  parent_status public.boq_status;
begin
  select status
    into parent_status
  from public.boqs
  where id = old.boq_id;

  if parent_status not in ('draft', 'active') then
    raise exception 'Only draft or active BOQs can change items';
  end if;

  if exists (
    select 1
    from public.boq_measurements m
    where m.boq_item_id = old.id
  ) then
    raise exception 'Cannot delete a BOQ item that has measurement history';
  end if;

  return old;
end;
$$;

create trigger prevent_boq_item_delete_when_locked
  before delete on public.boq_items
  for each row
  execute function public.prevent_boq_item_delete_when_locked();

create or replace function public.prevent_boq_measurement_illegal_change()
returns trigger
language plpgsql
as $$
declare
  parent_boq public.boqs%rowtype;
  parent_item public.boq_items%rowtype;
  remaining numeric(14, 3);
begin
  if tg_op = 'DELETE' then
    raise exception 'Measurements cannot be deleted. Void the record instead.';
  end if;

  select *
    into parent_boq
  from public.boqs
  where id = new.boq_id;

  select *
    into parent_item
  from public.boq_items
  where id = new.boq_item_id;

  if parent_boq.id is null
     or parent_item.id is null
     or parent_boq.business_id is distinct from new.business_id
     or parent_item.business_id is distinct from new.business_id
     or parent_boq.project_id is distinct from new.project_id
     or parent_item.boq_id is distinct from new.boq_id then
    raise exception 'Measurement must belong to the same project BOQ item';
  end if;

  if not public.project_belongs_to_business(new.project_id, new.business_id) then
    raise exception 'Measurement project must belong to the same business';
  end if;

  if new.unit is distinct from parent_item.unit then
    raise exception 'Measurement unit must match the BOQ item unit';
  end if;

  if tg_op = 'INSERT' then
    if parent_boq.status not in ('draft', 'active') then
      raise exception 'Measurements can only be added to draft or active BOQs';
    end if;

    if new.status is distinct from 'active' then
      raise exception 'New measurements must be active';
    end if;

    remaining := parent_item.estimated_quantity - parent_item.completed_quantity;

    if new.quantity > remaining then
      raise exception
        'Measurement exceeds remaining quantity. Remaining quantity: %',
        remaining;
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'void' then
      raise exception 'Voided measurements cannot be changed';
    end if;

    if new.business_id is distinct from old.business_id
       or new.project_id is distinct from old.project_id
       or new.boq_id is distinct from old.boq_id
       or new.boq_item_id is distinct from old.boq_item_id
       or new.measured_by is distinct from old.measured_by then
      raise exception 'Cannot change measurement scope or author';
    end if;

    if new.status is distinct from 'void' then
      raise exception 'Measurements cannot be edited. Void this record and add a corrected measurement.';
    end if;

    if new.quantity is distinct from old.quantity
       or new.unit is distinct from old.unit
       or new.measurement_date is distinct from old.measurement_date
       or new.description is distinct from old.description
       or new.location is distinct from old.location
       or new.reference is distinct from old.reference
       or new.notes is distinct from old.notes then
      raise exception 'Measurements cannot be edited. Void this record and add a corrected measurement.';
    end if;
  end if;

  return new;
end;
$$;

create trigger prevent_boq_measurement_illegal_change
  before insert or update or delete on public.boq_measurements
  for each row
  execute function public.prevent_boq_measurement_illegal_change();

create or replace function public.sync_boq_item_after_measurement()
returns trigger
language plpgsql
as $$
begin
  perform public.sync_boq_item_completed_quantity(
    coalesce(new.boq_item_id, old.boq_item_id)
  );
  return coalesce(new, old);
end;
$$;

create trigger sync_boq_item_after_measurement
  after insert or update on public.boq_measurements
  for each row
  execute function public.sync_boq_item_after_measurement();

alter table public.boqs enable row level security;
alter table public.boq_sections enable row level security;
alter table public.boq_items enable row level security;
alter table public.boq_measurements enable row level security;

create policy "Members can view BOQs"
  on public.boqs
  for select
  using (public.is_business_member(business_id));

create policy "Members can insert BOQs"
  on public.boqs
  for insert
  with check (
    public.is_business_member(business_id)
    and created_by = auth.uid()
    and public.project_belongs_to_business(project_id, business_id)
  );

create policy "Members can update BOQs"
  on public.boqs
  for update
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
  );

create policy "Members can delete draft BOQs"
  on public.boqs
  for delete
  using (
    public.is_business_member(business_id)
    and status = 'draft'
  );

create policy "Members can view BOQ sections"
  on public.boq_sections
  for select
  using (public.is_business_member(business_id));

create policy "Members can insert BOQ sections"
  on public.boq_sections
  for insert
  with check (
    public.is_business_member(business_id)
    and public.boq_belongs_to_business(boq_id, business_id)
  );

create policy "Members can update BOQ sections"
  on public.boq_sections
  for update
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.boq_belongs_to_business(boq_id, business_id)
  );

create policy "Members can delete BOQ sections"
  on public.boq_sections
  for delete
  using (public.is_business_member(business_id));

create policy "Members can view BOQ items"
  on public.boq_items
  for select
  using (public.is_business_member(business_id));

create policy "Members can insert BOQ items"
  on public.boq_items
  for insert
  with check (
    public.is_business_member(business_id)
    and public.boq_belongs_to_business(boq_id, business_id)
    and (
      section_id is null
      or public.boq_section_belongs_to_business(section_id, business_id)
    )
    and (
      material_id is null
      or public.material_belongs_to_business(material_id, business_id)
    )
  );

create policy "Members can update BOQ items"
  on public.boq_items
  for update
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.boq_belongs_to_business(boq_id, business_id)
    and (
      section_id is null
      or public.boq_section_belongs_to_business(section_id, business_id)
    )
    and (
      material_id is null
      or public.material_belongs_to_business(material_id, business_id)
    )
  );

create policy "Members can delete BOQ items"
  on public.boq_items
  for delete
  using (public.is_business_member(business_id));

create policy "Members can view BOQ measurements"
  on public.boq_measurements
  for select
  using (public.is_business_member(business_id));

create policy "Members can insert BOQ measurements"
  on public.boq_measurements
  for insert
  with check (
    public.is_business_member(business_id)
    and measured_by = auth.uid()
    and public.project_belongs_to_business(project_id, business_id)
    and public.boq_belongs_to_business(boq_id, business_id)
    and public.boq_item_belongs_to_business(boq_item_id, business_id)
  );

create policy "Members can update BOQ measurements"
  on public.boq_measurements
  for update
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
    and public.boq_belongs_to_business(boq_id, business_id)
    and public.boq_item_belongs_to_business(boq_item_id, business_id)
  );

revoke all on function public.boq_belongs_to_business(uuid, uuid)
  from public, anon;
revoke all on function public.boq_section_belongs_to_business(uuid, uuid)
  from public, anon;
revoke all on function public.boq_item_belongs_to_business(uuid, uuid)
  from public, anon;
revoke all on function public.boq_summaries(uuid)
  from public, anon;
revoke all on function public.sync_boq_item_completed_quantity(uuid)
  from public, anon;

grant execute on function public.boq_belongs_to_business(uuid, uuid)
  to authenticated;
grant execute on function public.boq_section_belongs_to_business(uuid, uuid)
  to authenticated;
grant execute on function public.boq_item_belongs_to_business(uuid, uuid)
  to authenticated;
grant execute on function public.boq_summaries(uuid)
  to authenticated;

revoke all on table public.boqs from anon;
revoke all on table public.boq_sections from anon;
revoke all on table public.boq_items from anon;
revoke all on table public.boq_measurements from anon;
