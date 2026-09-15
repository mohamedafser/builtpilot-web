-- BuildPilot Phase 5: materials, vendors, project materials,
-- and material transactions. Run after 20240912160000_labour_management.sql.
-- Daily report material snapshots stay unchanged.

create type public.material_category as enum (
  'cement',
  'sand',
  'aggregate',
  'steel',
  'bricks',
  'blocks',
  'plumbing',
  'electrical',
  'tiles',
  'paint',
  'wood',
  'hardware',
  'other'
);

create type public.material_unit as enum (
  'bag',
  'kg',
  'ton',
  'cubic_ft',
  'cubic_m',
  'piece',
  'box',
  'liter',
  'meter',
  'sq_ft',
  'sq_m',
  'other'
);

create type public.material_status as enum ('active', 'inactive');

create type public.vendor_status as enum ('active', 'inactive');

create type public.material_transaction_type as enum (
  'received',
  'used',
  'returned',
  'adjusted'
);

create type public.adjustment_direction as enum ('increase', 'decrease');

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  category public.material_category not null,
  unit public.material_unit not null,
  default_unit_price numeric(12, 2),
  minimum_stock numeric(12, 3),
  status public.material_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_name_present check (char_length(trim(name)) >= 2),
  constraint materials_default_unit_price_non_negative check (
    default_unit_price is null or default_unit_price >= 0
  ),
  constraint materials_minimum_stock_non_negative check (
    minimum_stock is null or minimum_stock >= 0
  )
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  status public.vendor_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_name_present check (char_length(trim(name)) >= 2)
);

create table public.project_materials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete restrict,
  planned_quantity numeric(12, 3),
  minimum_stock numeric(12, 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_materials_unique_assignment unique (project_id, material_id),
  constraint project_materials_planned_quantity_non_negative check (
    planned_quantity is null or planned_quantity >= 0
  ),
  constraint project_materials_minimum_stock_non_negative check (
    minimum_stock is null or minimum_stock >= 0
  )
);

create table public.material_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete restrict,
  vendor_id uuid references public.vendors (id) on delete restrict,
  transaction_type public.material_transaction_type not null,
  quantity numeric(12, 3) not null,
  unit_price numeric(12, 2),
  total_cost numeric(14, 2),
  transaction_date date not null,
  reference_number text,
  notes text,
  adjustment_direction public.adjustment_direction,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_transactions_quantity_positive check (quantity > 0),
  constraint material_transactions_unit_price_non_negative check (
    unit_price is null or unit_price >= 0
  ),
  constraint material_transactions_total_cost_non_negative check (
    total_cost is null or total_cost >= 0
  ),
  constraint material_transactions_adjustment_direction_required check (
    (
      transaction_type = 'adjusted'
      and adjustment_direction is not null
    )
    or (
      transaction_type <> 'adjusted'
      and adjustment_direction is null
    )
  ),
  constraint material_transactions_adjustment_reason_required check (
    transaction_type <> 'adjusted'
    or char_length(trim(coalesce(notes, ''))) >= 2
  ),
  constraint material_transactions_vendor_received_only check (
    vendor_id is null or transaction_type = 'received'
  )
);

create index materials_business_id_idx on public.materials (business_id);
create index materials_category_idx on public.materials (category);
create index materials_status_idx on public.materials (status);
create index materials_name_idx on public.materials (business_id, name);
create index materials_business_status_idx on public.materials (business_id, status);

create index vendors_business_id_idx on public.vendors (business_id);
create index vendors_status_idx on public.vendors (status);
create index vendors_name_idx on public.vendors (business_id, name);
create index vendors_business_status_idx on public.vendors (business_id, status);

create index project_materials_business_id_idx
  on public.project_materials (business_id);
create index project_materials_project_id_idx
  on public.project_materials (project_id);
create index project_materials_material_id_idx
  on public.project_materials (material_id);

create index material_transactions_business_id_idx
  on public.material_transactions (business_id);
create index material_transactions_project_id_idx
  on public.material_transactions (project_id);
create index material_transactions_material_id_idx
  on public.material_transactions (material_id);
create index material_transactions_vendor_id_idx
  on public.material_transactions (vendor_id);
create index material_transactions_type_idx
  on public.material_transactions (transaction_type);
create index material_transactions_date_idx
  on public.material_transactions (transaction_date desc);
create index material_transactions_project_material_idx
  on public.material_transactions (project_id, material_id);
create index material_transactions_project_date_idx
  on public.material_transactions (project_id, transaction_date desc);
create index material_transactions_vendor_date_idx
  on public.material_transactions (vendor_id, transaction_date desc);
create index material_transactions_business_date_idx
  on public.material_transactions (business_id, transaction_date desc);
create index material_transactions_created_by_idx
  on public.material_transactions (created_by);

create trigger set_materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

create trigger set_vendors_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

create trigger set_project_materials_updated_at
  before update on public.project_materials
  for each row execute function public.set_updated_at();

create trigger set_material_transactions_updated_at
  before update on public.material_transactions
  for each row execute function public.set_updated_at();

create or replace function public.prevent_material_business_change()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id then
    raise exception 'Cannot move a material to another business';
  end if;

  return new;
end;
$$;

create trigger prevent_material_business_change
  before update on public.materials
  for each row
  execute function public.prevent_material_business_change();

create or replace function public.prevent_vendor_business_change()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id then
    raise exception 'Cannot move a vendor to another business';
  end if;

  return new;
end;
$$;

create trigger prevent_vendor_business_change
  before update on public.vendors
  for each row
  execute function public.prevent_vendor_business_change();

create or replace function public.prevent_project_material_scope_change()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is distinct from old.project_id
     or new.material_id is distinct from old.material_id
     or new.business_id is distinct from old.business_id then
    raise exception 'Cannot change project material assignment scope';
  end if;

  return new;
end;
$$;

create trigger prevent_project_material_scope_change
  before update on public.project_materials
  for each row
  execute function public.prevent_project_material_scope_change();

create or replace function public.prevent_material_transaction_scope_change()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.project_id is distinct from old.project_id
     or new.material_id is distinct from old.material_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Cannot change material transaction business, project, material, or creator';
  end if;

  return new;
end;
$$;

create trigger prevent_material_transaction_scope_change
  before update on public.material_transactions
  for each row
  execute function public.prevent_material_transaction_scope_change();

create or replace function public.material_belongs_to_business(
  target_material_id uuid,
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
    from public.materials
    where id = target_material_id
      and business_id = target_business_id
  );
$$;

create or replace function public.vendor_belongs_to_business(
  target_vendor_id uuid,
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
    from public.vendors
    where id = target_vendor_id
      and business_id = target_business_id
  );
$$;

create or replace function public.project_material_matches_scope(
  target_project_id uuid,
  target_material_id uuid,
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
    and public.material_belongs_to_business(target_material_id, target_business_id);
$$;

create or replace function public.material_transaction_matches_scope(
  target_project_id uuid,
  target_material_id uuid,
  target_vendor_id uuid,
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
    and public.material_belongs_to_business(target_material_id, target_business_id)
    and (
      target_vendor_id is null
      or public.vendor_belongs_to_business(target_vendor_id, target_business_id)
    );
$$;

revoke all on function public.material_belongs_to_business(uuid, uuid)
  from public, anon;
revoke all on function public.vendor_belongs_to_business(uuid, uuid)
  from public, anon;
revoke all on function public.project_material_matches_scope(uuid, uuid, uuid)
  from public, anon;
revoke all on function public.material_transaction_matches_scope(uuid, uuid, uuid, uuid)
  from public, anon;

grant execute on function public.material_belongs_to_business(uuid, uuid)
  to authenticated;
grant execute on function public.vendor_belongs_to_business(uuid, uuid)
  to authenticated;
grant execute on function public.project_material_matches_scope(uuid, uuid, uuid)
  to authenticated;
grant execute on function public.material_transaction_matches_scope(uuid, uuid, uuid, uuid)
  to authenticated;

create view public.material_stock_balances
with (security_invoker = true) as
select
  t.business_id,
  t.project_id,
  t.material_id,
  coalesce(sum(
    case t.transaction_type
      when 'received' then t.quantity
      when 'returned' then t.quantity
      when 'used' then -t.quantity
      when 'adjusted' then
        case t.adjustment_direction
          when 'increase' then t.quantity
          when 'decrease' then -t.quantity
          else 0
        end
      else 0
    end
  ), 0) as current_stock,
  coalesce(sum(
    case when t.transaction_type = 'received' then t.quantity else 0 end
  ), 0) as total_received,
  coalesce(sum(
    case when t.transaction_type = 'used' then t.quantity else 0 end
  ), 0) as total_used,
  coalesce(sum(
    case when t.transaction_type = 'returned' then t.quantity else 0 end
  ), 0) as total_returned,
  coalesce(sum(
    case
      when t.transaction_type = 'received' then coalesce(t.total_cost, 0)
      else 0
    end
  ), 0) as total_purchased_cost
from public.material_transactions t
group by t.business_id, t.project_id, t.material_id;

alter table public.materials enable row level security;
alter table public.vendors enable row level security;
alter table public.project_materials enable row level security;
alter table public.material_transactions enable row level security;

revoke all on table public.materials from anon;
revoke all on table public.vendors from anon;
revoke all on table public.project_materials from anon;
revoke all on table public.material_transactions from anon;
revoke all on table public.material_stock_balances from anon;

grant select, insert, update on table public.materials to authenticated;
grant select, insert, update on table public.vendors to authenticated;
grant select, insert, update, delete on table public.project_materials
  to authenticated;
grant select, insert, update on table public.material_transactions
  to authenticated;
grant select on table public.material_stock_balances to authenticated;

create policy "Members can view business materials"
  on public.materials
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create business materials"
  on public.materials
  for insert
  to authenticated
  with check (public.is_business_member(business_id));

create policy "Members can update business materials"
  on public.materials
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Members can view business vendors"
  on public.vendors
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create business vendors"
  on public.vendors
  for insert
  to authenticated
  with check (public.is_business_member(business_id));

create policy "Members can update business vendors"
  on public.vendors
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "Members can view project materials"
  on public.project_materials
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create project materials"
  on public.project_materials
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and public.project_material_matches_scope(
      project_id,
      material_id,
      business_id
    )
  );

create policy "Members can update project materials"
  on public.project_materials
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.project_material_matches_scope(
      project_id,
      material_id,
      business_id
    )
  );

create policy "Members can delete project materials"
  on public.project_materials
  for delete
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can view material transactions"
  on public.material_transactions
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create material transactions"
  on public.material_transactions
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and public.material_transaction_matches_scope(
      project_id,
      material_id,
      vendor_id,
      business_id
    )
    and created_by = auth.uid()
  );

create policy "Members can update material transactions"
  on public.material_transactions
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.material_transaction_matches_scope(
      project_id,
      material_id,
      vendor_id,
      business_id
    )
  );

notify pgrst, 'reload schema';
