-- Seed default materials into each business catalog (like quotation defaults,
-- but stored as editable materials rows). Also seed on new business signup.

create or replace function public.seed_default_materials_for_business(
  target_business_id uuid,
  target_country_code text default 'IN'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  country text := upper(coalesce(nullif(trim(target_country_code), ''), 'IN'));
  inserted integer := 0;
begin
  if exists (
    select 1
    from public.materials m
    where m.business_id = target_business_id
    limit 1
  ) then
    return 0;
  end if;

  if country = 'AE' then
    insert into public.materials (
      business_id, name, category, unit, default_unit_price, minimum_stock, notes, status
    ) values
      (target_business_id, 'OPC Cement 50kg', 'cement', 'bag', null, 50, 'Default catalog item', 'active'),
      (target_business_id, 'TMT Steel', 'steel', 'kg', null, 500, 'Default catalog item', 'active'),
      (target_business_id, 'PVC Pipe', 'plumbing', 'meter', null, 20, 'Default catalog item', 'active'),
      (target_business_id, 'Electrical Cable', 'electrical', 'meter', null, 50, 'Default catalog item', 'active'),
      (target_business_id, 'Emulsion Paint', 'paint', 'liter', null, 20, 'Default catalog item', 'active'),
      (target_business_id, 'Hardware & fasteners', 'hardware', 'other', null, null, 'Default catalog item', 'active'),
      (target_business_id, 'Waterproofing compound', 'other', 'kg', null, 10, 'Default catalog item', 'active'),
      (target_business_id, 'Washed sand', 'sand', 'cubic_m', null, 10, 'Default catalog item', 'active'),
      (target_business_id, '20mm Aggregate', 'aggregate', 'cubic_m', null, 10, 'Default catalog item', 'active'),
      (target_business_id, 'Concrete blocks', 'blocks', 'piece', null, 200, 'Default catalog item', 'active'),
      (target_business_id, 'Floor tiles', 'tiles', 'sq_m', null, 20, 'Default catalog item', 'active'),
      (target_business_id, 'Plywood / formwork', 'wood', 'sq_m', null, 20, 'Default catalog item', 'active');
  else
    insert into public.materials (
      business_id, name, category, unit, default_unit_price, minimum_stock, notes, status
    ) values
      (target_business_id, 'OPC Cement 50kg', 'cement', 'bag', null, 50, 'Default catalog item', 'active'),
      (target_business_id, 'TMT Steel', 'steel', 'kg', null, 500, 'Default catalog item', 'active'),
      (target_business_id, 'PVC Pipe', 'plumbing', 'meter', null, 20, 'Default catalog item', 'active'),
      (target_business_id, 'Electrical Cable', 'electrical', 'meter', null, 50, 'Default catalog item', 'active'),
      (target_business_id, 'Emulsion Paint', 'paint', 'liter', null, 20, 'Default catalog item', 'active'),
      (target_business_id, 'Hardware & fasteners', 'hardware', 'other', null, null, 'Default catalog item', 'active'),
      (target_business_id, 'Waterproofing compound', 'other', 'kg', null, 10, 'Default catalog item', 'active'),
      (target_business_id, 'M-Sand / River sand', 'sand', 'cubic_ft', null, 200, 'Default catalog item', 'active'),
      (target_business_id, '20mm Aggregate / Jelly', 'aggregate', 'cubic_ft', null, 200, 'Default catalog item', 'active'),
      (target_business_id, 'Red bricks', 'bricks', 'piece', null, 1000, 'Default catalog item', 'active'),
      (target_business_id, 'Concrete blocks', 'blocks', 'piece', null, 200, 'Default catalog item', 'active'),
      (target_business_id, 'Floor tiles', 'tiles', 'sq_ft', null, 100, 'Default catalog item', 'active'),
      (target_business_id, 'Plywood / shuttering', 'wood', 'sq_ft', null, 50, 'Default catalog item', 'active');
  end if;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function public.seed_default_materials_for_business(uuid, text) from public;
grant execute on function public.seed_default_materials_for_business(uuid, text) to authenticated;
grant execute on function public.seed_default_materials_for_business(uuid, text) to service_role;

-- Seed defaults whenever a new business is created at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  business_name text;
  country_code text;
  currency_code text;
  language_code text;
  new_business_id uuid;
begin
  display_name := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
  business_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    'My Business'
  );

  country_code := upper(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'country_code'), ''),
    'IN'
  ));

  if country_code not in ('IN', 'AE') then
    country_code := 'IN';
  end if;

  currency_code := public.currency_for_country(country_code);

  language_code := lower(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'language'), ''),
    'en'
  ));

  if language_code not in ('en', 'ta', 'ar', 'hi') then
    language_code := 'en';
  end if;

  insert into public.profiles (id, full_name, language)
  values (new.id, display_name, language_code);

  insert into public.businesses (name, owner_id, country_code, currency_code)
  values (business_name, new.id, country_code, currency_code)
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, new.id, 'owner');

  perform public.seed_default_materials_for_business(new_business_id, country_code);

  return new;
end;
$$;

-- Backfill existing businesses that still have an empty materials catalog.
do $$
declare
  business_row record;
begin
  for business_row in
    select b.id, b.country_code
    from public.businesses b
    where not exists (
      select 1
      from public.materials m
      where m.business_id = b.id
    )
  loop
    perform public.seed_default_materials_for_business(
      business_row.id,
      coalesce(business_row.country_code, 'IN')
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
