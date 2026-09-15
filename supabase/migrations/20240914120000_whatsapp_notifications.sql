-- BuildPilot Phase 11: WhatsApp communication + in-app notifications.
-- Run after 20240914000000_ai_assistant.sql.
--
-- WhatsApp credentials stay in server env vars, never in these tables.
-- Client portal tokens remain hashed; messages store only the public portal URL
-- the contractor approved — never raw access tokens.

-- ---------------------------------------------------------------------------
-- Client WhatsApp preference columns on existing portal access
-- ---------------------------------------------------------------------------

alter table public.project_client_access
  add column if not exists whatsapp_enabled boolean not null default false,
  add column if not exists whatsapp_phone text,
  add column if not exists whatsapp_opted_in boolean not null default false,
  add column if not exists whatsapp_opted_in_at timestamptz;

alter table public.project_client_access
  drop constraint if exists project_client_access_whatsapp_phone_length;

alter table public.project_client_access
  add constraint project_client_access_whatsapp_phone_length
  check (
    whatsapp_phone is null
    or char_length(btrim(whatsapp_phone)) between 8 and 20
  );

alter table public.project_client_access
  drop constraint if exists project_client_access_whatsapp_opt_in_consistency;

alter table public.project_client_access
  add constraint project_client_access_whatsapp_opt_in_consistency
  check (
    (whatsapp_opted_in = false and whatsapp_opted_in_at is null)
    or (whatsapp_opted_in = true and whatsapp_opted_in_at is not null)
  );

-- ---------------------------------------------------------------------------
-- WhatsApp message log
-- ---------------------------------------------------------------------------

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  client_access_id uuid references public.project_client_access (id) on delete set null,
  recipient_phone text not null,
  message_type text not null,
  template_name text,
  content text,
  provider_message_id text,
  idempotency_key text,
  status text not null default 'queued',
  error_code text,
  error_message text,
  retryable boolean not null default false,
  sent_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_messages_recipient_present check (
    char_length(btrim(recipient_phone)) between 8 and 20
  ),
  constraint whatsapp_messages_type_check check (
    message_type in (
      'client_update',
      'portal_link',
      'daily_report',
      'quotation',
      'other'
    )
  ),
  constraint whatsapp_messages_status_check check (
    status in ('queued', 'sent', 'delivered', 'read', 'failed')
  ),
  constraint whatsapp_messages_content_length check (
    content is null or char_length(content) between 1 and 4000
  ),
  constraint whatsapp_messages_template_length check (
    template_name is null or char_length(btrim(template_name)) between 1 and 120
  ),
  constraint whatsapp_messages_error_code_length check (
    error_code is null or char_length(error_code) <= 80
  ),
  constraint whatsapp_messages_error_message_length check (
    error_message is null or char_length(error_message) <= 500
  )
);

create unique index if not exists whatsapp_messages_business_idempotency_key
  on public.whatsapp_messages (business_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists whatsapp_messages_provider_message_id_key
  on public.whatsapp_messages (provider_message_id)
  where provider_message_id is not null;

create index if not exists whatsapp_messages_business_id_idx
  on public.whatsapp_messages (business_id);
create index if not exists whatsapp_messages_project_id_idx
  on public.whatsapp_messages (project_id);
create index if not exists whatsapp_messages_client_access_id_idx
  on public.whatsapp_messages (client_access_id);
create index if not exists whatsapp_messages_status_idx
  on public.whatsapp_messages (status);
create index if not exists whatsapp_messages_created_at_idx
  on public.whatsapp_messages (created_at desc);
create index if not exists whatsapp_messages_project_created_at_idx
  on public.whatsapp_messages (project_id, created_at desc);

drop trigger if exists set_whatsapp_messages_updated_at on public.whatsapp_messages;
create trigger set_whatsapp_messages_updated_at
  before update on public.whatsapp_messages
  for each row execute function public.set_updated_at();

create or replace function public.prevent_whatsapp_message_scope_mismatch()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is not null
     and not public.project_belongs_to_business(new.project_id, new.business_id) then
    raise exception 'WhatsApp message project must belong to the same business';
  end if;

  if new.client_access_id is not null then
    if not exists (
      select 1
      from public.project_client_access a
      where a.id = new.client_access_id
        and a.business_id = new.business_id
        and (new.project_id is null or a.project_id = new.project_id)
    ) then
      raise exception 'WhatsApp message client access must belong to the same business/project';
    end if;
  end if;

  if not exists (
    select 1
    from public.business_members m
    where m.user_id = new.sent_by
      and m.business_id = new.business_id
  ) then
    raise exception 'WhatsApp sender must belong to the business';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_whatsapp_message_scope_mismatch on public.whatsapp_messages;
create trigger prevent_whatsapp_message_scope_mismatch
  before insert or update on public.whatsapp_messages
  for each row execute function public.prevent_whatsapp_message_scope_mismatch();

create or replace function public.prevent_whatsapp_message_illegal_update()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.sent_by is distinct from old.sent_by
     or new.project_id is distinct from old.project_id
     or new.client_access_id is distinct from old.client_access_id
     or new.idempotency_key is distinct from old.idempotency_key then
    raise exception 'Cannot change WhatsApp message ownership or identity fields';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_whatsapp_message_illegal_update on public.whatsapp_messages;
create trigger prevent_whatsapp_message_illegal_update
  before update on public.whatsapp_messages
  for each row execute function public.prevent_whatsapp_message_illegal_update();

-- ---------------------------------------------------------------------------
-- Webhook event idempotency
-- ---------------------------------------------------------------------------

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null,
  provider_message_id text,
  event_type text not null,
  payload_digest text,
  processed_at timestamptz not null default now(),
  constraint whatsapp_webhook_events_event_id_present check (
    char_length(btrim(provider_event_id)) between 1 and 200
  ),
  constraint whatsapp_webhook_events_type_length check (
    char_length(btrim(event_type)) between 1 and 80
  )
);

create unique index if not exists whatsapp_webhook_events_provider_event_id_key
  on public.whatsapp_webhook_events (provider_event_id);

create index if not exists whatsapp_webhook_events_message_id_idx
  on public.whatsapp_webhook_events (provider_message_id)
  where provider_message_id is not null;

alter table public.whatsapp_webhook_events enable row level security;

-- No authenticated policies: webhook table is service-role only.
revoke all on table public.whatsapp_webhook_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- In-app notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  action_url text,
  is_read boolean not null default false,
  dedupe_key text,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in (
      'daily_report',
      'material',
      'labour',
      'expense',
      'quotation',
      'boq',
      'client_portal',
      'whatsapp',
      'system'
    )
  ),
  constraint notifications_title_length check (
    char_length(btrim(title)) between 1 and 160
  ),
  constraint notifications_message_length check (
    char_length(btrim(message)) between 1 and 500
  ),
  constraint notifications_action_url_length check (
    action_url is null or char_length(action_url) <= 500
  )
);

create unique index if not exists notifications_user_dedupe_key
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_business_id_idx on public.notifications (business_id);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc);
create index if not exists notifications_project_id_idx on public.notifications (project_id);
create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

create or replace function public.prevent_notification_scope_mismatch()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is not null
     and not public.project_belongs_to_business(new.project_id, new.business_id) then
    raise exception 'Notification project must belong to the same business';
  end if;

  if not exists (
    select 1
    from public.business_members m
    where m.user_id = new.user_id
      and m.business_id = new.business_id
  ) then
    raise exception 'Notification recipient must belong to the business';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_notification_scope_mismatch on public.notifications;
create trigger prevent_notification_scope_mismatch
  before insert or update on public.notifications
  for each row execute function public.prevent_notification_scope_mismatch();

create or replace function public.prevent_notification_illegal_update()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.user_id is distinct from old.user_id
     or new.project_id is distinct from old.project_id
     or new.type is distinct from old.type
     or new.title is distinct from old.title
     or new.message is distinct from old.message
     or new.action_url is distinct from old.action_url
     or new.dedupe_key is distinct from old.dedupe_key
     or new.created_at is distinct from old.created_at then
    raise exception 'Only notification read state can be updated';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_notification_illegal_update on public.notifications;
create trigger prevent_notification_illegal_update
  before update on public.notifications
  for each row execute function public.prevent_notification_illegal_update();

-- ---------------------------------------------------------------------------
-- Notification preferences
-- ---------------------------------------------------------------------------

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_report_notifications boolean not null default true,
  quotation_notifications boolean not null default true,
  boq_notifications boolean not null default true,
  labour_notifications boolean not null default false,
  material_notifications boolean not null default true,
  client_portal_notifications boolean not null default true,
  whatsapp_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_user_business_unique
    unique (business_id, user_id)
);

create index if not exists notification_preferences_user_id_idx
  on public.notification_preferences (user_id);

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create or replace function public.prevent_notification_preferences_illegal_update()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.user_id is distinct from old.user_id then
    raise exception 'Notification preference owner cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_notification_preferences_illegal_update on public.notification_preferences;
create trigger prevent_notification_preferences_illegal_update
  before update on public.notification_preferences
  for each row
  execute function public.prevent_notification_preferences_illegal_update();

-- ---------------------------------------------------------------------------
-- Helper: notify business members of meaningful client portal access
-- ---------------------------------------------------------------------------

create or replace function public.create_client_portal_access_notifications(
  p_business_id uuid,
  p_project_id uuid,
  p_client_name text,
  p_project_name text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  member record;
  safe_client text := left(coalesce(nullif(btrim(p_client_name), ''), 'A client'), 80);
  safe_project text := left(coalesce(nullif(btrim(p_project_name), ''), 'project'), 120);
  window_key text := to_char(date_trunc('hour', now()), 'YYYYMMDDHH24');
begin
  for member in
    select m.user_id
    from public.business_members m
    left join public.notification_preferences p
      on p.user_id = m.user_id
     and p.business_id = m.business_id
    where m.business_id = p_business_id
      and coalesce(p.client_portal_notifications, true) = true
  loop
    insert into public.notifications (
      business_id,
      user_id,
      project_id,
      type,
      title,
      message,
      action_url,
      dedupe_key
    )
    values (
      p_business_id,
      member.user_id,
      p_project_id,
      'client_portal',
      'Client portal accessed',
      safe_client || ' accessed the ' || safe_project || ' client portal.',
      '/projects/' || p_project_id::text || '/client-portal',
      'portal_access:' || p_project_id::text || ':' || member.user_id::text || ':' || window_key
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end loop;
end;
$$;

revoke all on function public.create_client_portal_access_notifications(uuid, uuid, text, text)
  from public;
grant execute on function public.create_client_portal_access_notifications(uuid, uuid, text, text)
  to service_role;

-- Patch resolve_client_portal to emit a meaningful access notification
-- (throttled to the existing 15-minute last_accessed window).
-- Keep the exact existing RETURNS TABLE signature — PostgreSQL cannot
-- CREATE OR REPLACE a function when OUT/return columns change.

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
  did_touch boolean := false;
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
      did_touch := true;
    exception
      when others then
        null;
    end;
  end if;

  if did_touch
    and session_row.business_id is not null
    and session_row.project_id is not null then
    begin
      perform public.create_client_portal_access_notifications(
        session_row.business_id,
        session_row.project_id,
        session_row.client_name,
        session_row.project_name
      );
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

revoke all on function public.resolve_client_portal(text) from public;
grant execute on function public.resolve_client_portal(text)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.whatsapp_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "Members can view business WhatsApp messages" on public.whatsapp_messages;
create policy "Members can view business WhatsApp messages"
  on public.whatsapp_messages
  for select
  to authenticated
  using (public.is_business_member(business_id));

drop policy if exists "Members can insert WhatsApp messages" on public.whatsapp_messages;
create policy "Members can insert WhatsApp messages"
  on public.whatsapp_messages
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and sent_by = auth.uid()
    and (
      project_id is null
      or public.project_belongs_to_business(project_id, business_id)
    )
  );

drop policy if exists "Members can update WhatsApp message status" on public.whatsapp_messages;
create policy "Members can update WhatsApp message status"
  on public.whatsapp_messages
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications"
  on public.notifications
  for select
  to authenticated
  using (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  );

drop policy if exists "Users can update their notification read state" on public.notifications;
create policy "Users can update their notification read state"
  on public.notifications
  for update
  to authenticated
  using (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  );

-- Inserts are performed by trusted server paths (service role) or members
-- creating notifications for themselves/teammates via app mutations using
-- elevated helpers. Authenticated insert limited to own business membership.
drop policy if exists "Members can insert business notifications" on public.notifications;
create policy "Members can insert business notifications"
  on public.notifications
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and exists (
      select 1
      from public.business_members m
      where m.user_id = notifications.user_id
        and m.business_id = notifications.business_id
    )
  );

drop policy if exists "Users can view their notification preferences" on public.notification_preferences;
create policy "Users can view their notification preferences"
  on public.notification_preferences
  for select
  to authenticated
  using (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  );

drop policy if exists "Users can insert their notification preferences" on public.notification_preferences;
create policy "Users can insert their notification preferences"
  on public.notification_preferences
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  );

drop policy if exists "Users can update their notification preferences" on public.notification_preferences;
create policy "Users can update their notification preferences"
  on public.notification_preferences
  for update
  to authenticated
  using (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  );

revoke all on table public.whatsapp_messages from anon;
revoke all on table public.notifications from anon;
revoke all on table public.notification_preferences from anon;

grant select, insert, update on table public.whatsapp_messages to authenticated;
grant select, insert, update on table public.notifications to authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;
