-- Default vendor on catalog materials.
-- Run after 20240913120000_material_usage_vendors.sql.

alter table public.materials
  add column vendor_id uuid references public.vendors (id) on delete set null;

create index materials_vendor_id_idx on public.materials (vendor_id);

create or replace function public.prevent_material_vendor_scope_mismatch()
returns trigger
language plpgsql
as $$
begin
  if new.vendor_id is not null
     and not public.vendor_belongs_to_business(new.vendor_id, new.business_id) then
    raise exception 'Material vendor must belong to the same business';
  end if;

  return new;
end;
$$;

create trigger prevent_material_vendor_scope_mismatch
  before insert or update on public.materials
  for each row
  execute function public.prevent_material_vendor_scope_mismatch();
