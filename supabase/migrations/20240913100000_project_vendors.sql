-- BuildPilot: assign vendors to projects from vendor detail.
-- Run after 20240912180000_materials_vendors.sql.

create table public.project_vendors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_vendors_unique_assignment unique (project_id, vendor_id)
);

create index project_vendors_business_id_idx
  on public.project_vendors (business_id);
create index project_vendors_project_id_idx
  on public.project_vendors (project_id);
create index project_vendors_vendor_id_idx
  on public.project_vendors (vendor_id);

create trigger set_project_vendors_updated_at
  before update on public.project_vendors
  for each row execute function public.set_updated_at();

create or replace function public.prevent_project_vendor_scope_change()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is distinct from old.project_id
     or new.vendor_id is distinct from old.vendor_id
     or new.business_id is distinct from old.business_id then
    raise exception 'Cannot change project vendor assignment scope';
  end if;

  return new;
end;
$$;

create trigger prevent_project_vendor_scope_change
  before update on public.project_vendors
  for each row
  execute function public.prevent_project_vendor_scope_change();

create or replace function public.project_vendor_matches_scope(
  target_project_id uuid,
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
    and public.vendor_belongs_to_business(target_vendor_id, target_business_id);
$$;

revoke all on function public.project_vendor_matches_scope(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.project_vendor_matches_scope(uuid, uuid, uuid)
  to authenticated;

alter table public.project_vendors enable row level security;

revoke all on table public.project_vendors from anon;
grant select, insert, update, delete on table public.project_vendors
  to authenticated;

create policy "Members can view project vendors"
  on public.project_vendors
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create project vendors"
  on public.project_vendors
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and public.project_vendor_matches_scope(
      project_id,
      vendor_id,
      business_id
    )
  );

create policy "Members can update project vendors"
  on public.project_vendors
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.project_vendor_matches_scope(
      project_id,
      vendor_id,
      business_id
    )
  );

create policy "Members can delete project vendors"
  on public.project_vendors
  for delete
  to authenticated
  using (public.is_business_member(business_id));
