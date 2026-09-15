-- BuildPilot Phase 7: quotations and estimates.
-- Run after 20240913160000_project_expenses.sql.
-- Quotation totals are estimates. Actual project cost stays in
-- labour attendance, material transactions, and project expenses.

create type public.quotation_status as enum (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'cancelled'
);

create type public.quotation_item_type as enum (
  'material',
  'labour',
  'custom'
);

create type public.discount_type as enum (
  'percentage',
  'fixed'
);

create table public.quotation_counters (
  business_id uuid not null references public.businesses (id) on delete cascade,
  year integer not null,
  last_number integer not null default 0,
  primary key (business_id, year),
  constraint quotation_counters_year_valid check (year >= 2000),
  constraint quotation_counters_last_number_positive check (last_number >= 0)
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  quotation_number text not null,
  title text not null,
  client_name text not null,
  client_phone text,
  client_email text,
  client_address text,
  quotation_date date not null,
  valid_until date,
  subtotal numeric(14, 2) not null default 0,
  discount_type public.discount_type,
  discount_value numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  tax_percentage numeric(7, 3),
  tax_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  notes text,
  terms text,
  status public.quotation_status not null default 'draft',
  rejection_reason text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotations_number_present check (
    char_length(trim(quotation_number)) >= 1
  ),
  constraint quotations_title_present check (
    char_length(trim(title)) >= 2
  ),
  constraint quotations_client_name_present check (
    char_length(trim(client_name)) >= 1
  ),
  constraint quotations_validity_ordered check (
    valid_until is null or valid_until >= quotation_date
  ),
  constraint quotations_subtotal_non_negative check (subtotal >= 0),
  constraint quotations_discount_value_non_negative check (discount_value >= 0),
  constraint quotations_discount_amount_non_negative check (discount_amount >= 0),
  constraint quotations_discount_not_over_subtotal check (
    discount_amount <= subtotal
  ),
  constraint quotations_discount_type_matches check (
    (discount_type is null and discount_value = 0 and discount_amount = 0)
    or discount_type is not null
  ),
  constraint quotations_tax_percentage_non_negative check (
    tax_percentage is null or tax_percentage >= 0
  ),
  constraint quotations_tax_amount_non_negative check (tax_amount >= 0),
  constraint quotations_total_non_negative check (total_amount >= 0),
  constraint quotations_number_unique unique (business_id, quotation_number)
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  item_type public.quotation_item_type not null,
  material_id uuid references public.materials (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null,
  unit text not null,
  unit_price numeric(14, 2) not null,
  total_amount numeric(14, 2) not null,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotation_items_description_present check (
    char_length(trim(description)) >= 1
  ),
  constraint quotation_items_unit_present check (
    char_length(trim(unit)) >= 1
  ),
  constraint quotation_items_quantity_positive check (quantity > 0),
  constraint quotation_items_unit_price_non_negative check (unit_price >= 0),
  constraint quotation_items_total_non_negative check (total_amount >= 0),
  constraint quotation_items_material_required check (
    (item_type = 'material' and material_id is not null)
    or (item_type <> 'material' and material_id is null)
  )
);

create index quotations_business_id_idx
  on public.quotations (business_id);
create index quotations_project_id_idx
  on public.quotations (project_id);
create index quotations_status_idx
  on public.quotations (status);
create index quotations_quotation_date_idx
  on public.quotations (quotation_date desc);
create index quotations_client_name_idx
  on public.quotations (client_name);
create index quotations_business_date_idx
  on public.quotations (business_id, quotation_date desc);
create index quotations_business_status_idx
  on public.quotations (business_id, status);
create index quotation_items_quotation_id_idx
  on public.quotation_items (quotation_id);
create index quotation_items_business_id_idx
  on public.quotation_items (business_id);
create index quotation_items_material_id_idx
  on public.quotation_items (material_id);
create index quotation_items_item_type_idx
  on public.quotation_items (item_type);
create index quotation_items_sort_order_idx
  on public.quotation_items (quotation_id, sort_order);

create trigger set_quotations_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

create trigger set_quotation_items_updated_at
  before update on public.quotation_items
  for each row execute function public.set_updated_at();

create or replace function public.quotation_belongs_to_business(
  target_quotation_id uuid,
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
    from public.quotations q
    where q.id = target_quotation_id
      and q.business_id = target_business_id
  );
$$;

create or replace function public.next_quotation_number(target_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from timezone('utc', now()))::integer;
  next_num integer;
begin
  if not public.is_business_member(target_business_id) then
    raise exception 'Not authorized to generate a quotation number';
  end if;

  insert into public.quotation_counters (business_id, year, last_number)
  values (target_business_id, current_year, 1)
  on conflict (business_id, year)
  do update set last_number = public.quotation_counters.last_number + 1
  returning last_number into next_num;

  return 'BP-' || current_year::text || '-' || lpad(next_num::text, 4, '0');
end;
$$;

create or replace function public.quotation_workspace_stats(
  target_business_id uuid
)
returns table (
  total bigint,
  draft bigint,
  sent bigint,
  accepted bigint,
  rejected bigint,
  expired bigint,
  cancelled bigint,
  accepted_value numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_business_member(target_business_id) then
    return;
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where q.status = 'draft')::bigint,
    count(*) filter (
      where q.status = 'sent'
        and (q.valid_until is null or q.valid_until >= current_date)
    )::bigint,
    count(*) filter (where q.status = 'accepted')::bigint,
    count(*) filter (where q.status = 'rejected')::bigint,
    count(*) filter (
      where q.status = 'sent'
        and q.valid_until is not null
        and q.valid_until < current_date
    )::bigint,
    count(*) filter (where q.status = 'cancelled')::bigint,
    coalesce(sum(q.total_amount) filter (where q.status = 'accepted'), 0)
  from public.quotations q
  where q.business_id = target_business_id;
end;
$$;

create or replace function public.prevent_quotation_illegal_update()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.created_by is distinct from old.created_by
     or new.quotation_number is distinct from old.quotation_number then
    raise exception 'Cannot change quotation business, creator, or number';
  end if;

  if old.project_id is not null
     and new.project_id is distinct from old.project_id then
    raise exception 'Cannot change a linked quotation project';
  end if;

  if old.status = 'accepted' then
    if new.status is distinct from old.status then
      raise exception 'Accepted quotations cannot change status';
    end if;

    if new.subtotal is distinct from old.subtotal
       or new.discount_type is distinct from old.discount_type
       or new.discount_value is distinct from old.discount_value
       or new.discount_amount is distinct from old.discount_amount
       or new.tax_percentage is distinct from old.tax_percentage
       or new.tax_amount is distinct from old.tax_amount
       or new.total_amount is distinct from old.total_amount
       or new.title is distinct from old.title
       or new.client_name is distinct from old.client_name
       or new.client_phone is distinct from old.client_phone
       or new.client_email is distinct from old.client_email
       or new.client_address is distinct from old.client_address
       or new.quotation_date is distinct from old.quotation_date
       or new.valid_until is distinct from old.valid_until
       or new.notes is distinct from old.notes
       or new.terms is distinct from old.terms then
      raise exception 'Accepted quotations cannot be edited';
    end if;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'draft' and new.status not in ('sent', 'cancelled') then
      raise exception 'Invalid quotation status change';
    end if;

    if old.status = 'sent' and new.status not in ('accepted', 'rejected', 'cancelled') then
      raise exception 'Invalid quotation status change';
    end if;

    if old.status in ('rejected', 'expired', 'cancelled') then
      raise exception 'Invalid quotation status change';
    end if;
  end if;

  return new;
end;
$$;

create trigger prevent_quotation_illegal_update
  before update on public.quotations
  for each row
  execute function public.prevent_quotation_illegal_update();

create or replace function public.prevent_quotation_scope_mismatch()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is not null
     and not public.project_belongs_to_business(new.project_id, new.business_id) then
    raise exception 'Quotation project must belong to the same business';
  end if;

  return new;
end;
$$;

create trigger prevent_quotation_scope_mismatch
  before insert or update on public.quotations
  for each row
  execute function public.prevent_quotation_scope_mismatch();

create or replace function public.prevent_quotation_item_scope_mismatch()
returns trigger
language plpgsql
as $$
begin
  if not public.quotation_belongs_to_business(new.quotation_id, new.business_id) then
    raise exception 'Quotation item must belong to the same business';
  end if;

  if new.material_id is not null
     and not public.material_belongs_to_business(new.material_id, new.business_id) then
    raise exception 'Quotation material must belong to the same business';
  end if;

  return new;
end;
$$;

create trigger prevent_quotation_item_scope_mismatch
  before insert or update on public.quotation_items
  for each row
  execute function public.prevent_quotation_item_scope_mismatch();

create or replace function public.prevent_non_draft_quotation_item_change()
returns trigger
language plpgsql
as $$
declare
  quotation_status public.quotation_status;
  target_quotation_id uuid;
begin
  target_quotation_id := coalesce(new.quotation_id, old.quotation_id);

  select status
    into quotation_status
  from public.quotations
  where id = target_quotation_id;

  if quotation_status is distinct from 'draft' then
    raise exception 'Only draft quotations can change items';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger prevent_non_draft_quotation_item_change
  before insert or update or delete on public.quotation_items
  for each row
  execute function public.prevent_non_draft_quotation_item_change();

alter table public.quotation_counters enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

create policy "Members can view quotation counters"
  on public.quotation_counters
  for select
  using (public.is_business_member(business_id));

create policy "Members can view quotations"
  on public.quotations
  for select
  using (public.is_business_member(business_id));

create policy "Members can insert quotations"
  on public.quotations
  for insert
  with check (
    public.is_business_member(business_id)
    and created_by = auth.uid()
    and (
      project_id is null
      or public.project_belongs_to_business(project_id, business_id)
    )
  );

create policy "Members can update quotations"
  on public.quotations
  for update
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and (
      project_id is null
      or public.project_belongs_to_business(project_id, business_id)
    )
  );

create policy "Members can delete draft quotations"
  on public.quotations
  for delete
  using (
    public.is_business_member(business_id)
    and status = 'draft'
  );

create policy "Members can view quotation items"
  on public.quotation_items
  for select
  using (public.is_business_member(business_id));

create policy "Members can insert quotation items"
  on public.quotation_items
  for insert
  with check (
    public.is_business_member(business_id)
    and public.quotation_belongs_to_business(quotation_id, business_id)
    and (
      material_id is null
      or public.material_belongs_to_business(material_id, business_id)
    )
  );

create policy "Members can update quotation items"
  on public.quotation_items
  for update
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.quotation_belongs_to_business(quotation_id, business_id)
    and (
      material_id is null
      or public.material_belongs_to_business(material_id, business_id)
    )
  );

create policy "Members can delete quotation items"
  on public.quotation_items
  for delete
  using (public.is_business_member(business_id));
