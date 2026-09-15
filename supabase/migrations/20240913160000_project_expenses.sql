-- BuildPilot Phase 6: project expenses, receipt storage,
-- and SQL cost aggregations. Run after 20240913140000_material_default_vendor.sql.
-- Labour attendance and material transactions remain the source of those costs.

create type public.expense_category as enum (
  'equipment',
  'transport',
  'fuel',
  'tools',
  'machinery',
  'permits',
  'subcontractor',
  'electricity',
  'water',
  'site_security',
  'accommodation',
  'food',
  'miscellaneous',
  'other'
);

create type public.expense_payment_method as enum (
  'cash',
  'bank_transfer',
  'upi',
  'card',
  'cheque',
  'other'
);

create type public.expense_status as enum ('active', 'void');

create table public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  vendor_id uuid references public.vendors (id) on delete set null,
  category public.expense_category not null,
  description text not null,
  amount numeric(14, 2) not null,
  expense_date date not null,
  payment_method public.expense_payment_method,
  reference_number text,
  receipt_path text,
  notes text,
  status public.expense_status not null default 'active',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_expenses_description_present check (
    char_length(trim(description)) >= 1
  ),
  constraint project_expenses_amount_positive check (amount > 0)
);

create index project_expenses_business_id_idx
  on public.project_expenses (business_id);
create index project_expenses_project_id_idx
  on public.project_expenses (project_id);
create index project_expenses_vendor_id_idx
  on public.project_expenses (vendor_id);
create index project_expenses_expense_date_idx
  on public.project_expenses (expense_date desc);
create index project_expenses_category_idx
  on public.project_expenses (category);
create index project_expenses_status_idx
  on public.project_expenses (status);
create index project_expenses_project_date_idx
  on public.project_expenses (project_id, expense_date desc);
create index project_expenses_project_status_idx
  on public.project_expenses (project_id, status);
create index project_expenses_business_date_idx
  on public.project_expenses (business_id, expense_date desc);

create trigger set_project_expenses_updated_at
  before update on public.project_expenses
  for each row execute function public.set_updated_at();

create or replace function public.prevent_project_expense_scope_change()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.project_id is distinct from old.project_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Cannot change expense business, project, or creator';
  end if;

  return new;
end;
$$;

create trigger prevent_project_expense_scope_change
  before update on public.project_expenses
  for each row
  execute function public.prevent_project_expense_scope_change();

create or replace function public.prevent_project_expense_scope_mismatch()
returns trigger
language plpgsql
as $$
begin
  if not public.project_belongs_to_business(new.project_id, new.business_id) then
    raise exception 'Expense project must belong to the same business';
  end if;

  if new.vendor_id is not null
     and not public.vendor_belongs_to_business(new.vendor_id, new.business_id) then
    raise exception 'Expense vendor must belong to the same business';
  end if;

  return new;
end;
$$;

create trigger prevent_project_expense_scope_mismatch
  before insert or update on public.project_expenses
  for each row
  execute function public.prevent_project_expense_scope_mismatch();

create or replace function public.is_expense_receipt_member(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
  target_business_id uuid;
begin
  parts := storage.foldername(object_name);

  if coalesce(parts[1], '') <> 'business' or parts[2] is null then
    return false;
  end if;

  begin
    target_business_id := parts[2]::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  return public.is_business_member(target_business_id);
end;
$$;

create or replace function public.project_cost_totals(
  target_project_id uuid,
  range_from date default null,
  range_to date default null
)
returns table (
  labour_cost numeric,
  material_cost numeric,
  expense_cost numeric,
  labour_records bigint,
  material_records bigint,
  expense_records bigint
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
     or not public.is_business_member(target_business_id) then
    return;
  end if;

  return query
  select
    coalesce((
      select sum(wa.wage)
      from public.worker_attendance wa
      where wa.project_id = target_project_id
        and wa.business_id = target_business_id
        and (range_from is null or wa.attendance_date >= range_from)
        and (range_to is null or wa.attendance_date <= range_to)
    ), 0),
    coalesce((
      select sum(mt.total_cost)
      from public.material_transactions mt
      where mt.project_id = target_project_id
        and mt.business_id = target_business_id
        and mt.transaction_type = 'received'
        and (range_from is null or mt.transaction_date >= range_from)
        and (range_to is null or mt.transaction_date <= range_to)
    ), 0),
    coalesce((
      select sum(pe.amount)
      from public.project_expenses pe
      where pe.project_id = target_project_id
        and pe.business_id = target_business_id
        and pe.status = 'active'
        and (range_from is null or pe.expense_date >= range_from)
        and (range_to is null or pe.expense_date <= range_to)
    ), 0),
    coalesce((
      select count(*)::bigint
      from public.worker_attendance wa
      where wa.project_id = target_project_id
        and wa.business_id = target_business_id
        and (range_from is null or wa.attendance_date >= range_from)
        and (range_to is null or wa.attendance_date <= range_to)
    ), 0),
    coalesce((
      select count(*)::bigint
      from public.material_transactions mt
      where mt.project_id = target_project_id
        and mt.business_id = target_business_id
        and mt.transaction_type = 'received'
        and (range_from is null or mt.transaction_date >= range_from)
        and (range_to is null or mt.transaction_date <= range_to)
    ), 0),
    coalesce((
      select count(*)::bigint
      from public.project_expenses pe
      where pe.project_id = target_project_id
        and pe.business_id = target_business_id
        and pe.status = 'active'
        and (range_from is null or pe.expense_date >= range_from)
        and (range_to is null or pe.expense_date <= range_to)
    ), 0);
end;
$$;

create or replace function public.projects_cost_totals(target_project_ids uuid[])
returns table (
  project_id uuid,
  labour_cost numeric,
  material_cost numeric,
  expense_cost numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with allowed as (
    select p.id
    from public.projects p
    where p.id = any (target_project_ids)
      and public.is_business_member(p.business_id)
  ),
  labour as (
    select wa.project_id, coalesce(sum(wa.wage), 0) as total
    from public.worker_attendance wa
    join allowed a on a.id = wa.project_id
    group by wa.project_id
  ),
  materials as (
    select mt.project_id, coalesce(sum(mt.total_cost), 0) as total
    from public.material_transactions mt
    join allowed a on a.id = mt.project_id
    where mt.transaction_type = 'received'
    group by mt.project_id
  ),
  expenses as (
    select pe.project_id, coalesce(sum(pe.amount), 0) as total
    from public.project_expenses pe
    join allowed a on a.id = pe.project_id
    where pe.status = 'active'
    group by pe.project_id
  )
  select
    a.id,
    coalesce(l.total, 0),
    coalesce(m.total, 0),
    coalesce(e.total, 0)
  from allowed a
  left join labour l on l.project_id = a.id
  left join materials m on m.project_id = a.id
  left join expenses e on e.project_id = a.id;
end;
$$;

create or replace function public.project_monthly_costs(
  target_project_id uuid,
  range_from date,
  range_to date
)
returns table (
  month_start date,
  labour_cost numeric,
  material_cost numeric,
  expense_cost numeric
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
     or not public.is_business_member(target_business_id) then
    return;
  end if;

  if range_from is null or range_to is null or range_to < range_from then
    return;
  end if;

  return query
  with months as (
    select date_trunc('month', d)::date as month_start
    from generate_series(
      date_trunc('month', range_from::timestamp),
      date_trunc('month', range_to::timestamp),
      interval '1 month'
    ) as d
  ),
  labour as (
    select date_trunc('month', wa.attendance_date)::date as month_start,
           coalesce(sum(wa.wage), 0) as total
    from public.worker_attendance wa
    where wa.project_id = target_project_id
      and wa.business_id = target_business_id
      and wa.attendance_date >= range_from
      and wa.attendance_date <= range_to
    group by 1
  ),
  materials as (
    select date_trunc('month', mt.transaction_date)::date as month_start,
           coalesce(sum(mt.total_cost), 0) as total
    from public.material_transactions mt
    where mt.project_id = target_project_id
      and mt.business_id = target_business_id
      and mt.transaction_type = 'received'
      and mt.transaction_date >= range_from
      and mt.transaction_date <= range_to
    group by 1
  ),
  expenses as (
    select date_trunc('month', pe.expense_date)::date as month_start,
           coalesce(sum(pe.amount), 0) as total
    from public.project_expenses pe
    where pe.project_id = target_project_id
      and pe.business_id = target_business_id
      and pe.status = 'active'
      and pe.expense_date >= range_from
      and pe.expense_date <= range_to
    group by 1
  )
  select
    months.month_start,
    coalesce(labour.total, 0),
    coalesce(materials.total, 0),
    coalesce(expenses.total, 0)
  from months
  left join labour on labour.month_start = months.month_start
  left join materials on materials.month_start = months.month_start
  left join expenses on expenses.month_start = months.month_start
  order by months.month_start;
end;
$$;

create or replace function public.project_expense_category_totals(
  target_project_id uuid,
  range_from date default null,
  range_to date default null
)
returns table (
  category public.expense_category,
  total_amount numeric,
  expense_count bigint
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
     or not public.is_business_member(target_business_id) then
    return;
  end if;

  return query
  select
    pe.category,
    coalesce(sum(pe.amount), 0),
    count(*)::bigint
  from public.project_expenses pe
  where pe.project_id = target_project_id
    and pe.business_id = target_business_id
    and pe.status = 'active'
    and (range_from is null or pe.expense_date >= range_from)
    and (range_to is null or pe.expense_date <= range_to)
  group by pe.category
  order by coalesce(sum(pe.amount), 0) desc, pe.category;
end;
$$;

revoke all on function public.is_expense_receipt_member(text)
  from public, anon;
revoke all on function public.project_cost_totals(uuid, date, date)
  from public, anon;
revoke all on function public.projects_cost_totals(uuid[])
  from public, anon;
revoke all on function public.project_monthly_costs(uuid, date, date)
  from public, anon;
revoke all on function public.project_expense_category_totals(uuid, date, date)
  from public, anon;

grant execute on function public.is_expense_receipt_member(text)
  to authenticated;
grant execute on function public.project_cost_totals(uuid, date, date)
  to authenticated;
grant execute on function public.projects_cost_totals(uuid[])
  to authenticated;
grant execute on function public.project_monthly_costs(uuid, date, date)
  to authenticated;
grant execute on function public.project_expense_category_totals(uuid, date, date)
  to authenticated;

alter table public.project_expenses enable row level security;

create policy "Members can view business project expenses"
  on public.project_expenses
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can insert business project expenses"
  on public.project_expenses
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
    and (
      vendor_id is null
      or public.vendor_belongs_to_business(vendor_id, business_id)
    )
    and created_by = (select auth.uid())
  );

create policy "Members can update business project expenses"
  on public.project_expenses
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
    and (
      vendor_id is null
      or public.vendor_belongs_to_business(vendor_id, business_id)
    )
  );

create policy "Members can delete business project expenses"
  on public.project_expenses
  for delete
  to authenticated
  using (public.is_business_member(business_id));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'expense-receipts',
  'expense-receipts',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Business members can upload expense receipts"
  on storage.objects;
drop policy if exists "Business members can read expense receipts"
  on storage.objects;
drop policy if exists "Business members can update expense receipts"
  on storage.objects;
drop policy if exists "Business members can delete expense receipts"
  on storage.objects;

create policy "Business members can upload expense receipts"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'expense-receipts'
    and public.is_expense_receipt_member(name)
  );

create policy "Business members can read expense receipts"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and public.is_expense_receipt_member(name)
  );

create policy "Business members can update expense receipts"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and public.is_expense_receipt_member(name)
  )
  with check (
    bucket_id = 'expense-receipts'
    and public.is_expense_receipt_member(name)
  );

create policy "Business members can delete expense receipts"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and public.is_expense_receipt_member(name)
  );

notify pgrst, 'reload schema';
