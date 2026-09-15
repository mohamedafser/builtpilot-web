  -- BuildPilot Phase 9: Client portal and client communication.
  -- Run after 20240913200000_boq_measurements.sql.
  -- Public portal access uses hashed tokens and security-definer RPCs.
  -- Do not grant direct table access to anon.

  create table public.project_client_access (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id) on delete cascade,
    project_id uuid not null references public.projects (id) on delete cascade,
    client_name text not null,
    client_email text,
    client_phone text,
    access_token_hash text not null,
    is_active boolean not null default true,
    expires_at timestamptz,
    last_accessed_at timestamptz,
    created_by uuid not null references public.profiles (id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint project_client_access_client_name_present check (
      char_length(trim(client_name)) >= 1
    ),
    constraint project_client_access_token_hash_present check (
      char_length(access_token_hash) = 64
    )
  );

  create table public.project_client_settings (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id) on delete cascade,
    project_id uuid not null references public.projects (id) on delete cascade,
    show_project_overview boolean not null default true,
    show_daily_reports boolean not null default true,
    show_site_photos boolean not null default true,
    show_boq boolean not null default true,
    show_measurements boolean not null default true,
    show_quotation boolean not null default false,
    show_project_cost boolean not null default false,
    show_client_contact boolean not null default true,
    show_project_location boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint project_client_settings_project_unique unique (project_id)
  );

  create unique index project_client_access_token_hash_key
    on public.project_client_access (access_token_hash);
  create index project_client_access_business_id_idx
    on public.project_client_access (business_id);
  create index project_client_access_project_id_idx
    on public.project_client_access (project_id);
  create index project_client_access_is_active_idx
    on public.project_client_access (is_active);
  create index project_client_access_expires_at_idx
    on public.project_client_access (expires_at);
  create index project_client_access_project_active_idx
    on public.project_client_access (project_id, is_active);

  create index project_client_settings_business_id_idx
    on public.project_client_settings (business_id);
  create index project_client_settings_project_id_idx
    on public.project_client_settings (project_id);

  create trigger set_project_client_access_updated_at
    before update on public.project_client_access
    for each row execute function public.set_updated_at();

  create trigger set_project_client_settings_updated_at
    before update on public.project_client_settings
    for each row execute function public.set_updated_at();

  create or replace function public.prevent_client_access_scope_mismatch()
  returns trigger
  language plpgsql
  as $$
  begin
    if not public.project_belongs_to_business(new.project_id, new.business_id) then
      raise exception 'Client portal project must belong to the same business';
    end if;

    if not exists (
      select 1
      from public.business_members m
      where m.user_id = new.created_by
        and m.business_id = new.business_id
    ) then
      raise exception 'Client portal creator must belong to the business';
    end if;

    return new;
  end;
  $$;

  create trigger prevent_client_access_scope_mismatch
    before insert or update on public.project_client_access
    for each row
    execute function public.prevent_client_access_scope_mismatch();

  create or replace function public.prevent_client_access_illegal_update()
  returns trigger
  language plpgsql
  as $$
  begin
    if new.business_id is distinct from old.business_id
      or new.project_id is distinct from old.project_id
      or new.created_by is distinct from old.created_by then
      raise exception 'Cannot change client portal business, project, or creator';
    end if;

    return new;
  end;
  $$;

  create trigger prevent_client_access_illegal_update
    before update on public.project_client_access
    for each row
    execute function public.prevent_client_access_illegal_update();

  create or replace function public.prevent_client_settings_scope_mismatch()
  returns trigger
  language plpgsql
  as $$
  begin
    if not public.project_belongs_to_business(new.project_id, new.business_id) then
      raise exception 'Client portal settings project must belong to the same business';
    end if;

    return new;
  end;
  $$;

  create trigger prevent_client_settings_scope_mismatch
    before insert or update on public.project_client_settings
    for each row
    execute function public.prevent_client_settings_scope_mismatch();

  create or replace function public.prevent_client_settings_illegal_update()
  returns trigger
  language plpgsql
  as $$
  begin
    if new.business_id is distinct from old.business_id
      or new.project_id is distinct from old.project_id then
      raise exception 'Cannot change client portal settings business or project';
    end if;

    return new;
  end;
  $$;

  create trigger prevent_client_settings_illegal_update
    before update on public.project_client_settings
    for each row
    execute function public.prevent_client_settings_illegal_update();

  alter table public.project_client_access enable row level security;
  alter table public.project_client_settings enable row level security;

  create policy "Members can view client portal access"
    on public.project_client_access
    for select
    using (public.is_business_member(business_id));

  create policy "Members can insert client portal access"
    on public.project_client_access
    for insert
    with check (
      public.is_business_member(business_id)
      and created_by = auth.uid()
      and public.project_belongs_to_business(project_id, business_id)
    );

  create policy "Members can update client portal access"
    on public.project_client_access
    for update
    using (public.is_business_member(business_id))
    with check (
      public.is_business_member(business_id)
      and public.project_belongs_to_business(project_id, business_id)
    );

  create policy "Members can delete client portal access"
    on public.project_client_access
    for delete
    using (public.is_business_member(business_id));

  create policy "Members can view client portal settings"
    on public.project_client_settings
    for select
    using (public.is_business_member(business_id));

  create policy "Members can insert client portal settings"
    on public.project_client_settings
    for insert
    with check (
      public.is_business_member(business_id)
      and public.project_belongs_to_business(project_id, business_id)
    );

  create policy "Members can update client portal settings"
    on public.project_client_settings
    for update
    using (public.is_business_member(business_id))
    with check (
      public.is_business_member(business_id)
      and public.project_belongs_to_business(project_id, business_id)
    );

  create policy "Members can delete client portal settings"
    on public.project_client_settings
    for delete
    using (public.is_business_member(business_id));

revoke all on table public.project_client_access from anon, public;
revoke all on table public.project_client_settings from anon, public;
grant select, insert, update, delete on table public.project_client_access
  to authenticated;
grant select, insert, update, delete on table public.project_client_settings
  to authenticated;

  create or replace function public.lookup_client_portal(p_token_hash text)
  returns table (
    status text,
    access_id uuid,
    business_id uuid,
    project_id uuid,
    client_name text,
    client_email text,
    client_phone text,
    expires_at timestamptz,
    last_accessed_at timestamptz,
    business_name text,
    project_name text,
    project_status public.project_status,
    project_location text,
    project_description text,
    project_start_date date,
    project_expected_end_date date,
    project_client_name text,
    project_client_email text,
    project_client_phone text,
    show_project_overview boolean,
    show_daily_reports boolean,
    show_site_photos boolean,
    show_boq boolean,
    show_measurements boolean,
    show_quotation boolean,
    show_project_cost boolean,
    show_client_contact boolean,
    show_project_location boolean
  )
  language plpgsql
  stable
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    rec public.project_client_access%rowtype;
    settings_row public.project_client_settings%rowtype;
    project_row public.projects%rowtype;
    business_row public.businesses%rowtype;
  begin
    if p_token_hash is null
      or p_token_hash !~ '^[0-9a-f]{64}$' then
      status := 'invalid';
      return next;
      return;
    end if;

    select *
      into rec
    from public.project_client_access a
    where a.access_token_hash = p_token_hash;

    if rec.id is null then
      status := 'invalid';
      return next;
      return;
    end if;

    if not rec.is_active then
      status := 'revoked';
      return next;
      return;
    end if;

    if rec.expires_at is not null and rec.expires_at <= now() then
      status := 'expired';
      return next;
      return;
    end if;

    select *
      into project_row
    from public.projects p
    where p.id = rec.project_id
      and p.business_id = rec.business_id;

    if project_row.id is null then
      status := 'invalid';
      return next;
      return;
    end if;

    select *
      into business_row
    from public.businesses b
    where b.id = rec.business_id;

    select *
      into settings_row
    from public.project_client_settings s
    where s.project_id = rec.project_id
      and s.business_id = rec.business_id;

    status := 'ok';
    access_id := rec.id;
    business_id := rec.business_id;
    project_id := rec.project_id;
    client_name := rec.client_name;
    client_email := rec.client_email;
    client_phone := rec.client_phone;
    expires_at := rec.expires_at;
    last_accessed_at := rec.last_accessed_at;
    business_name := business_row.name;
    project_name := project_row.name;
    project_status := project_row.status;
    project_location := project_row.location;
    project_description := project_row.description;
    project_start_date := project_row.start_date;
    project_expected_end_date := project_row.expected_end_date;
    project_client_name := project_row.client_name;
    project_client_email := project_row.client_email;
    project_client_phone := project_row.client_phone;
    show_project_overview := coalesce(settings_row.show_project_overview, true);
    show_daily_reports := coalesce(settings_row.show_daily_reports, true);
    show_site_photos := coalesce(settings_row.show_site_photos, true);
    show_boq := coalesce(settings_row.show_boq, true);
    show_measurements := coalesce(settings_row.show_measurements, true);
    show_quotation := coalesce(settings_row.show_quotation, false);
    show_project_cost := coalesce(settings_row.show_project_cost, false);
    show_client_contact := coalesce(settings_row.show_client_contact, true);
    show_project_location := coalesce(settings_row.show_project_location, true);
    return next;
  end;
  $$;

  create or replace function public.resolve_client_portal(p_token_hash text)
  returns table (
    status text,
    access_id uuid,
    business_id uuid,
    project_id uuid,
    client_name text,
    client_email text,
    client_phone text,
    expires_at timestamptz,
    last_accessed_at timestamptz,
    business_name text,
    project_name text,
    project_status public.project_status,
    project_location text,
    project_description text,
    project_start_date date,
    project_expected_end_date date,
    project_client_name text,
    project_client_email text,
    project_client_phone text,
    show_project_overview boolean,
    show_daily_reports boolean,
    show_site_photos boolean,
    show_boq boolean,
    show_measurements boolean,
    show_quotation boolean,
    show_project_cost boolean,
    show_client_contact boolean,
    show_project_location boolean
  )
  language plpgsql
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    session_row record;
  begin
    select *
      into session_row
    from public.lookup_client_portal(p_token_hash)
    limit 1;

    if session_row.status = 'ok'
      and session_row.access_id is not null
      and (
        session_row.last_accessed_at is null
        or session_row.last_accessed_at < now() - interval '15 minutes'
      ) then
      begin
        update public.project_client_access as access_row
        set last_accessed_at = now()
        where access_row.id = session_row.access_id;
        session_row.last_accessed_at := now();
      exception
        when others then
          null;
      end;
    end if;

    status := session_row.status;
    access_id := session_row.access_id;
    business_id := session_row.business_id;
    project_id := session_row.project_id;
    client_name := session_row.client_name;
    client_email := session_row.client_email;
    client_phone := session_row.client_phone;
    expires_at := session_row.expires_at;
    last_accessed_at := session_row.last_accessed_at;
    business_name := session_row.business_name;
    project_name := session_row.project_name;
    project_status := session_row.project_status;
    project_location := session_row.project_location;
    project_description := session_row.project_description;
    project_start_date := session_row.project_start_date;
    project_expected_end_date := session_row.project_expected_end_date;
    project_client_name := session_row.project_client_name;
    project_client_email := session_row.project_client_email;
    project_client_phone := session_row.project_client_phone;
    show_project_overview := session_row.show_project_overview;
    show_daily_reports := session_row.show_daily_reports;
    show_site_photos := session_row.show_site_photos;
    show_boq := session_row.show_boq;
    show_measurements := session_row.show_measurements;
    show_quotation := session_row.show_quotation;
    show_project_cost := session_row.show_project_cost;
    show_client_contact := session_row.show_client_contact;
    show_project_location := session_row.show_project_location;
    return next;
  end;
  $$;

  create or replace function public.client_portal_reports(
    p_token_hash text,
    p_limit integer default 20,
    p_offset integer default 0
  )
  returns table (
    id uuid,
    report_date date,
    weather text,
    work_completed text,
    issues text,
    tomorrow_plan text,
    general_notes text,
    photo_count bigint,
    worker_count bigint,
    total_count bigint
  )
  language plpgsql
  stable
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    session_row record;
    safe_limit integer;
    safe_offset integer;
  begin
    select *
      into session_row
    from public.lookup_client_portal(p_token_hash)
    limit 1;

    if session_row.status is distinct from 'ok'
      or coalesce(session_row.show_daily_reports, false) is not true then
      return;
    end if;

    safe_limit := greatest(1, least(coalesce(p_limit, 20), 50));
    safe_offset := greatest(0, coalesce(p_offset, 0));

    return query
    select
      r.id,
      r.report_date,
      r.weather,
      r.work_completed,
      r.issues,
      r.tomorrow_plan,
      r.general_notes,
      (
        select count(*)::bigint
        from public.site_photos p
        where p.daily_report_id = r.id
          and p.project_id = session_row.project_id
          and p.business_id = session_row.business_id
      ),
      (
        select coalesce(sum(m.worker_count), 0)::bigint
        from public.daily_report_manpower m
        where m.daily_report_id = r.id
      ),
      count(*) over()::bigint
    from public.daily_site_reports r
    where r.project_id = session_row.project_id
      and r.business_id = session_row.business_id
      and r.archived_at is null
    order by r.report_date desc, r.created_at desc
    limit safe_limit
    offset safe_offset;
  end;
  $$;

  create or replace function public.client_portal_report(
    p_token_hash text,
    p_report_id uuid
  )
  returns table (
    id uuid,
    report_date date,
    weather text,
    work_completed text,
    issues text,
    tomorrow_plan text,
    general_notes text
  )
  language plpgsql
  stable
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    session_row record;
  begin
    select *
      into session_row
    from public.lookup_client_portal(p_token_hash)
    limit 1;

    if session_row.status is distinct from 'ok'
      or coalesce(session_row.show_daily_reports, false) is not true
      or p_report_id is null then
      return;
    end if;

    return query
    select
      r.id,
      r.report_date,
      r.weather,
      r.work_completed,
      r.issues,
      r.tomorrow_plan,
      r.general_notes
    from public.daily_site_reports r
    where r.id = p_report_id
      and r.project_id = session_row.project_id
      and r.business_id = session_row.business_id
      and r.archived_at is null;
  end;
  $$;

  create or replace function public.client_portal_report_manpower(
    p_token_hash text,
    p_report_id uuid
  )
  returns table (
    role public.manpower_role,
    worker_count integer
  )
  language plpgsql
  stable
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    session_row record;
  begin
    if not exists (
      select 1
      from public.client_portal_report(p_token_hash, p_report_id)
    ) then
      return;
    end if;

    select *
      into session_row
    from public.lookup_client_portal(p_token_hash)
    limit 1;

    return query
    select m.role, m.worker_count
    from public.daily_report_manpower m
    join public.daily_site_reports r
      on r.id = m.daily_report_id
    where m.daily_report_id = p_report_id
      and r.project_id = session_row.project_id
      and r.business_id = session_row.business_id
    order by m.created_at;
  end;
  $$;

  create or replace function public.client_portal_photos(
    p_token_hash text,
    p_limit integer default 20,
    p_offset integer default 0
  )
  returns table (
    id uuid,
    storage_path text,
    caption text,
    created_at timestamptz,
    daily_report_id uuid,
    report_date date,
    total_count bigint
  )
  language plpgsql
  stable
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    session_row record;
    safe_limit integer;
    safe_offset integer;
  begin
    select *
      into session_row
    from public.lookup_client_portal(p_token_hash)
    limit 1;

    if session_row.status is distinct from 'ok'
      or coalesce(session_row.show_site_photos, false) is not true then
      return;
    end if;

    safe_limit := greatest(1, least(coalesce(p_limit, 20), 50));
    safe_offset := greatest(0, coalesce(p_offset, 0));

    return query
    select
      p.id,
      p.storage_path,
      p.caption,
      p.created_at,
      p.daily_report_id,
      r.report_date,
      count(*) over()::bigint
    from public.site_photos p
    left join public.daily_site_reports r
      on r.id = p.daily_report_id
    and r.project_id = p.project_id
    and r.business_id = p.business_id
    where p.project_id = session_row.project_id
      and p.business_id = session_row.business_id
      and (p.daily_report_id is null or r.archived_at is null)
    order by p.created_at desc
    limit safe_limit
    offset safe_offset;
  end;
  $$;

  create or replace function public.client_portal_boq_items(p_token_hash text)
  returns table (
    boq_id uuid,
    boq_name text,
    section_id uuid,
    section_name text,
    section_sort_order integer,
    item_id uuid,
    item_code text,
    description text,
    unit public.boq_unit,
    estimated_quantity numeric,
    completed_quantity numeric,
    rate numeric,
    estimated_amount numeric,
    sort_order integer
  )
  language plpgsql
  stable
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    session_row record;
    target_boq public.boqs%rowtype;
  begin
    select *
      into session_row
    from public.lookup_client_portal(p_token_hash)
    limit 1;

    if session_row.status is distinct from 'ok'
      or coalesce(session_row.show_boq, false) is not true then
      return;
    end if;

    select b.*
      into target_boq
    from public.boqs b
    where b.project_id = session_row.project_id
      and b.business_id = session_row.business_id
      and b.status <> 'archived'
    order by
      case b.status
        when 'active' then 0
        when 'completed' then 1
        else 2
      end,
      b.created_at desc
    limit 1;

    if target_boq.id is null then
      return;
    end if;

    return query
    select
      target_boq.id,
      target_boq.name,
      i.section_id,
      s.name,
      coalesce(s.sort_order, 0),
      i.id,
      i.item_code,
      i.description,
      i.unit,
      i.estimated_quantity,
      i.completed_quantity,
      i.rate,
      i.estimated_amount,
      i.sort_order
    from public.boq_items i
    left join public.boq_sections s
      on s.id = i.section_id
    and s.boq_id = i.boq_id
    where i.boq_id = target_boq.id
      and i.business_id = session_row.business_id
    order by
      coalesce(s.sort_order, 2147483647),
      s.created_at,
      i.sort_order,
      i.created_at;
  end;
  $$;

  create or replace function public.client_portal_measurements(
    p_token_hash text,
    p_limit integer default 20,
    p_offset integer default 0
  )
  returns table (
    id uuid,
    measurement_date date,
    quantity numeric,
    unit public.boq_unit,
    location text,
    description text,
    reference text,
    item_description text,
    total_count bigint
  )
  language plpgsql
  stable
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    session_row record;
    target_boq_id uuid;
    safe_limit integer;
    safe_offset integer;
  begin
    select *
      into session_row
    from public.lookup_client_portal(p_token_hash)
    limit 1;

    if session_row.status is distinct from 'ok'
      or coalesce(session_row.show_measurements, false) is not true then
      return;
    end if;

    select b.id
      into target_boq_id
    from public.boqs b
    where b.project_id = session_row.project_id
      and b.business_id = session_row.business_id
      and b.status <> 'archived'
    order by
      case b.status
        when 'active' then 0
        when 'completed' then 1
        else 2
      end,
      b.created_at desc
    limit 1;

    if target_boq_id is null then
      return;
    end if;

    safe_limit := greatest(1, least(coalesce(p_limit, 20), 50));
    safe_offset := greatest(0, coalesce(p_offset, 0));

    return query
    select
      m.id,
      m.measurement_date,
      m.quantity,
      m.unit,
      m.location,
      m.description,
      m.reference,
      i.description,
      count(*) over()::bigint
    from public.boq_measurements m
    join public.boq_items i
      on i.id = m.boq_item_id
    where m.project_id = session_row.project_id
      and m.business_id = session_row.business_id
      and m.boq_id = target_boq_id
      and m.status = 'active'
    order by m.measurement_date desc, m.created_at desc
    limit safe_limit
    offset safe_offset;
  end;
  $$;

  create or replace function public.client_portal_quotation(p_token_hash text)
  returns table (
    id uuid,
    quotation_number text,
    title text,
    quotation_date date,
    valid_until date,
    client_name text,
    client_phone text,
    client_email text,
    client_address text,
    subtotal numeric,
    discount_type public.discount_type,
    discount_value numeric,
    discount_amount numeric,
    tax_percentage numeric,
    tax_amount numeric,
    total_amount numeric,
    notes text,
    terms text
  )
  language plpgsql
  stable
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    session_row record;
  begin
    select *
      into session_row
    from public.lookup_client_portal(p_token_hash)
    limit 1;

    if session_row.status is distinct from 'ok'
      or coalesce(session_row.show_quotation, false) is not true then
      return;
    end if;

    return query
    select
      q.id,
      q.quotation_number,
      q.title,
      q.quotation_date,
      q.valid_until,
      q.client_name,
      q.client_phone,
      q.client_email,
      q.client_address,
      q.subtotal,
      q.discount_type,
      q.discount_value,
      q.discount_amount,
      q.tax_percentage,
      q.tax_amount,
      q.total_amount,
      q.notes,
      q.terms
    from public.quotations q
    where q.project_id = session_row.project_id
      and q.business_id = session_row.business_id
      and q.status = 'accepted'
    order by q.quotation_date desc, q.created_at desc
    limit 1;
  end;
  $$;

  create or replace function public.client_portal_quotation_items(p_token_hash text)
  returns table (
    id uuid,
    description text,
    quantity numeric,
    unit text,
    unit_price numeric,
    total_amount numeric,
    sort_order integer
  )
  language plpgsql
  stable
  security definer
  set search_path = public
  set row_security = off
  as $$
  declare
    quotation_row record;
  begin
    select *
      into quotation_row
    from public.client_portal_quotation(p_token_hash)
    limit 1;

    if quotation_row.id is null then
      return;
    end if;

    return query
    select
      i.id,
      i.description,
      i.quantity,
      i.unit,
      i.unit_price,
      i.total_amount,
      i.sort_order
    from public.quotation_items i
    where i.quotation_id = quotation_row.id
    order by i.sort_order, i.created_at;
  end;
  $$;

  create or replace function public.client_portal_cost_totals(p_token_hash text)
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
  set row_security = off
  as $$
  declare
    session_row record;
  begin
    select *
      into session_row
    from public.lookup_client_portal(p_token_hash)
    limit 1;

    if session_row.status is distinct from 'ok'
      or coalesce(session_row.show_project_cost, false) is not true then
      return;
    end if;

    return query
    select
      coalesce((
        select sum(wa.wage)
        from public.worker_attendance wa
        where wa.project_id = session_row.project_id
          and wa.business_id = session_row.business_id
      ), 0),
      coalesce((
        select sum(mt.total_cost)
        from public.material_transactions mt
        where mt.project_id = session_row.project_id
          and mt.business_id = session_row.business_id
          and mt.transaction_type = 'received'
      ), 0),
      coalesce((
        select sum(pe.amount)
        from public.project_expenses pe
        where pe.project_id = session_row.project_id
          and pe.business_id = session_row.business_id
          and pe.status = 'active'
      ), 0),
      coalesce((
        select count(*)::bigint
        from public.worker_attendance wa
        where wa.project_id = session_row.project_id
          and wa.business_id = session_row.business_id
      ), 0),
      coalesce((
        select count(*)::bigint
        from public.material_transactions mt
        where mt.project_id = session_row.project_id
          and mt.business_id = session_row.business_id
          and mt.transaction_type = 'received'
      ), 0),
      coalesce((
        select count(*)::bigint
        from public.project_expenses pe
        where pe.project_id = session_row.project_id
          and pe.business_id = session_row.business_id
          and pe.status = 'active'
      ), 0);
  end;
  $$;

  revoke all on function public.lookup_client_portal(text) from public;
  grant execute on function public.lookup_client_portal(text)
    to anon, authenticated;
  revoke all on function public.resolve_client_portal(text) from public;
  revoke all on function public.client_portal_reports(text, integer, integer) from public;
  revoke all on function public.client_portal_report(text, uuid) from public;
  revoke all on function public.client_portal_report_manpower(text, uuid) from public;
  revoke all on function public.client_portal_photos(text, integer, integer) from public;
  revoke all on function public.client_portal_boq_items(text) from public;
  revoke all on function public.client_portal_measurements(text, integer, integer) from public;
  revoke all on function public.client_portal_quotation(text) from public;
  revoke all on function public.client_portal_quotation_items(text) from public;
  revoke all on function public.client_portal_cost_totals(text) from public;

  grant execute on function public.resolve_client_portal(text)
    to anon, authenticated;
  grant execute on function public.client_portal_reports(text, integer, integer)
    to anon, authenticated;
  grant execute on function public.client_portal_report(text, uuid)
    to anon, authenticated;
  grant execute on function public.client_portal_report_manpower(text, uuid)
    to anon, authenticated;
  grant execute on function public.client_portal_photos(text, integer, integer)
    to anon, authenticated;
  grant execute on function public.client_portal_boq_items(text)
    to anon, authenticated;
  grant execute on function public.client_portal_measurements(text, integer, integer)
    to anon, authenticated;
  grant execute on function public.client_portal_quotation(text)
    to anon, authenticated;
  grant execute on function public.client_portal_quotation_items(text)
    to anon, authenticated;
  grant execute on function public.client_portal_cost_totals(text)
    to anon, authenticated;

notify pgrst, 'reload schema';
