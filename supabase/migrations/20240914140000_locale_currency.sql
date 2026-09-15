-- BuildPilot: multi-language + multi-currency preferences.
-- Run after 20240914120000_whatsapp_notifications.sql.
--
-- Country is captured at signup and drives default currency.
-- Default language is English (en). Supported: en, ta, ar, hi.

alter table public.profiles
  add column if not exists language text not null default 'en';

alter table public.profiles
  drop constraint if exists profiles_language_check;

alter table public.profiles
  add constraint profiles_language_check
  check (language in ('en', 'ta', 'ar', 'hi'));

alter table public.businesses
  add column if not exists country_code text not null default 'IN',
  add column if not exists currency_code text not null default 'INR';

alter table public.businesses
  drop constraint if exists businesses_country_code_check;

alter table public.businesses
  add constraint businesses_country_code_check
  check (char_length(country_code) = 2);

alter table public.businesses
  drop constraint if exists businesses_currency_code_check;

alter table public.businesses
  add constraint businesses_currency_code_check
  check (char_length(currency_code) = 3);

create or replace function public.currency_for_country(p_country text)
returns text
language sql
immutable
as $$
  -- Supported now: India (INR) and UAE (AED). Other countries default to INR.
  select case upper(coalesce(nullif(btrim(p_country), ''), 'IN'))
    when 'IN' then 'INR'
    when 'AE' then 'AED'
    else 'INR'
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  display_name text;
  business_name text;
  country_code text;
  currency_code text;
  language_code text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  business_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    display_name || '''s Business'
  );

  country_code := upper(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'country_code'), ''),
    'IN'
  ));

  -- Only India and UAE are supported for now.
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

  return new;
end;
$$;

notify pgrst, 'reload schema';
