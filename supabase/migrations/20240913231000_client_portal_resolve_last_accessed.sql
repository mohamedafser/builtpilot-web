  -- Fix: RETURNS TABLE last_accessed_at made UPDATE ... RETURNING last_accessed_at
  -- ambiguous (42702), so public links failed after a valid token lookup.

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

  -- Grant the read-only lookup used by public portal pages.
  -- Safe to re-run.

  grant execute on function public.lookup_client_portal(text)
    to anon, authenticated;
  grant execute on function public.resolve_client_portal(text)
    to anon, authenticated;

  notify pgrst, 'reload schema';
