-- BuildPilot Phase 7 follow-up: link quotation labour items to workers.
-- Run after 20240913180000_quotations.sql.

alter table public.quotation_items
  add column worker_id uuid references public.workers (id) on delete set null;

create index quotation_items_worker_id_idx
  on public.quotation_items (worker_id);

alter table public.quotation_items
  add constraint quotation_items_worker_required check (
    (item_type = 'labour' and worker_id is not null)
    or (item_type <> 'labour' and worker_id is null)
  );

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

  if new.worker_id is not null
     and not public.worker_belongs_to_business(new.worker_id, new.business_id) then
    raise exception 'Quotation worker must belong to the same business';
  end if;

  return new;
end;
$$;

drop policy if exists "Members can insert quotation items" on public.quotation_items;
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
    and (
      worker_id is null
      or public.worker_belongs_to_business(worker_id, business_id)
    )
  );

drop policy if exists "Members can update quotation items" on public.quotation_items;
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
    and (
      worker_id is null
      or public.worker_belongs_to_business(worker_id, business_id)
    )
  );
