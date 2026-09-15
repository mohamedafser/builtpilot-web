-- BuildPilot: reusable quotation estimate templates (custom per business).
-- Built-in country templates live in application code; this table stores
-- user-saved customizations.

create table public.quotation_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  country_code text not null,
  currency_code text not null,
  project_type text not null default 'residential',
  description text,
  payload jsonb not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotation_templates_name_present check (
    char_length(trim(name)) >= 2
  ),
  constraint quotation_templates_country_present check (
    char_length(trim(country_code)) >= 2
  ),
  constraint quotation_templates_currency_present check (
    char_length(trim(currency_code)) >= 3
  ),
  constraint quotation_templates_payload_object check (
    jsonb_typeof(payload) = 'object'
  )
);

create index quotation_templates_business_id_idx
  on public.quotation_templates (business_id);

create index quotation_templates_business_country_idx
  on public.quotation_templates (business_id, country_code);

create trigger quotation_templates_set_updated_at
before update on public.quotation_templates
for each row
execute function public.set_updated_at();

alter table public.quotation_templates enable row level security;

create policy "quotation_templates_select_member"
  on public.quotation_templates
  for select
  to authenticated
  using (
    business_id in (
      select business_id from public.business_members where user_id = auth.uid()
    )
  );

create policy "quotation_templates_insert_member"
  on public.quotation_templates
  for insert
  to authenticated
  with check (
    business_id in (
      select business_id from public.business_members where user_id = auth.uid()
    )
    and created_by = auth.uid()
  );

create policy "quotation_templates_update_member"
  on public.quotation_templates
  for update
  to authenticated
  using (
    business_id in (
      select business_id from public.business_members where user_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select business_id from public.business_members where user_id = auth.uid()
    )
  );

create policy "quotation_templates_delete_member"
  on public.quotation_templates
  for delete
  to authenticated
  using (
    business_id in (
      select business_id from public.business_members where user_id = auth.uid()
    )
  );
