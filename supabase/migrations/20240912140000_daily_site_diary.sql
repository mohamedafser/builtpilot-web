-- BuildPilot Phase 3: daily site diary, manpower snapshot, materials
-- snapshot, site photo metadata, and private Storage for site photos.
-- Run after 20240912120000_project_management.sql.

create type public.manpower_role as enum (
  'mason',
  'helper',
  'carpenter',
  'electrician',
  'plumber',
  'other'
);

create type public.material_entry_type as enum ('received', 'used');

create table public.daily_site_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  report_date date not null,
  weather text,
  work_completed text not null,
  issues text,
  tomorrow_plan text,
  general_notes text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_site_reports_work_completed_present check (
    char_length(trim(work_completed)) > 0
  )
);

create table public.daily_report_manpower (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_site_reports (id) on delete cascade,
  role public.manpower_role not null,
  worker_count integer not null,
  created_at timestamptz not null default now(),
  constraint daily_report_manpower_count_non_negative check (worker_count >= 0),
  unique (daily_report_id, role)
);

create table public.daily_report_materials (
  id uuid primary key default gen_random_uuid(),
  daily_report_id uuid not null references public.daily_site_reports (id) on delete cascade,
  material_name text not null,
  quantity numeric(14, 2) not null,
  unit text not null,
  type public.material_entry_type not null,
  created_at timestamptz not null default now(),
  constraint daily_report_materials_name_present check (
    char_length(trim(material_name)) > 0
  ),
  constraint daily_report_materials_quantity_positive check (quantity > 0),
  constraint daily_report_materials_unit_present check (
    char_length(trim(unit)) > 0
  )
);

create table public.site_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  daily_report_id uuid references public.daily_site_reports (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  file_size integer not null,
  mime_type text not null,
  caption text,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint site_photos_file_size_positive check (file_size > 0),
  constraint site_photos_file_name_present check (
    char_length(trim(file_name)) > 0
  ),
  constraint site_photos_storage_path_present check (
    char_length(trim(storage_path)) > 0
  )
);

create index daily_site_reports_project_id_idx
  on public.daily_site_reports (project_id);
create index daily_site_reports_business_id_idx
  on public.daily_site_reports (business_id);
create index daily_site_reports_report_date_idx
  on public.daily_site_reports (report_date desc);
create index daily_site_reports_created_by_idx
  on public.daily_site_reports (created_by);
create index daily_site_reports_archived_at_idx
  on public.daily_site_reports (archived_at);
create index daily_site_reports_project_date_idx
  on public.daily_site_reports (project_id, report_date desc);

create unique index daily_site_reports_project_date_active_idx
  on public.daily_site_reports (project_id, report_date)
  where archived_at is null;

create index daily_report_manpower_report_id_idx
  on public.daily_report_manpower (daily_report_id);
create index daily_report_materials_report_id_idx
  on public.daily_report_materials (daily_report_id);

create index site_photos_project_id_idx
  on public.site_photos (project_id);
create index site_photos_daily_report_id_idx
  on public.site_photos (daily_report_id);
create index site_photos_business_id_idx
  on public.site_photos (business_id);
create index site_photos_uploaded_by_idx
  on public.site_photos (uploaded_by);

create trigger set_daily_site_reports_updated_at
  before update on public.daily_site_reports
  for each row execute function public.set_updated_at();

create or replace function public.prevent_daily_report_scope_change()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is distinct from old.project_id
     or new.business_id is distinct from old.business_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Cannot change daily report project, business, or author';
  end if;

  return new;
end;
$$;

create trigger prevent_daily_report_scope_change
  before update on public.daily_site_reports
  for each row
  execute function public.prevent_daily_report_scope_change();

create or replace function public.prevent_site_photo_scope_change()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is distinct from old.project_id
     or new.business_id is distinct from old.business_id
     or new.daily_report_id is distinct from old.daily_report_id
     or new.uploaded_by is distinct from old.uploaded_by
     or new.storage_path is distinct from old.storage_path then
    raise exception 'Cannot change site photo ownership or storage path';
  end if;

  return new;
end;
$$;

create trigger prevent_site_photo_scope_change
  before update on public.site_photos
  for each row
  execute function public.prevent_site_photo_scope_change();

create or replace function public.project_belongs_to_business(
  target_project_id uuid,
  target_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = target_project_id
      and business_id = target_business_id
  );
$$;

create or replace function public.can_access_daily_report(target_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.daily_site_reports
    where id = target_report_id
      and public.is_business_member(business_id)
  );
$$;

create or replace function public.daily_report_matches_scope(
  target_report_id uuid,
  target_project_id uuid,
  target_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.daily_site_reports
    where id = target_report_id
      and project_id = target_project_id
      and business_id = target_business_id
  );
$$;

create or replace function public.is_site_photo_member(object_name text)
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

revoke all on function public.project_belongs_to_business(uuid, uuid) from public, anon;
revoke all on function public.can_access_daily_report(uuid) from public, anon;
revoke all on function public.daily_report_matches_scope(uuid, uuid, uuid) from public, anon;
revoke all on function public.is_site_photo_member(text) from public, anon;

grant execute on function public.project_belongs_to_business(uuid, uuid) to authenticated;
grant execute on function public.can_access_daily_report(uuid) to authenticated;
grant execute on function public.daily_report_matches_scope(uuid, uuid, uuid) to authenticated;
grant execute on function public.is_site_photo_member(text) to authenticated;

alter table public.daily_site_reports enable row level security;
alter table public.daily_report_manpower enable row level security;
alter table public.daily_report_materials enable row level security;
alter table public.site_photos enable row level security;

revoke all on table public.daily_site_reports from anon;
revoke all on table public.daily_report_manpower from anon;
revoke all on table public.daily_report_materials from anon;
revoke all on table public.site_photos from anon;

grant select, insert, update, delete on table public.daily_site_reports to authenticated;
grant select, insert, update, delete on table public.daily_report_manpower to authenticated;
grant select, insert, update, delete on table public.daily_report_materials to authenticated;
grant select, insert, update, delete on table public.site_photos to authenticated;

create policy "Members can view business daily reports"
  on public.daily_site_reports
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can create business daily reports"
  on public.daily_site_reports
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
  );

create policy "Members can update business daily reports"
  on public.daily_site_reports
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
  );

create policy "Members can delete business daily reports"
  on public.daily_site_reports
  for delete
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can view report manpower"
  on public.daily_report_manpower
  for select
  to authenticated
  using (public.can_access_daily_report(daily_report_id));

create policy "Members can create report manpower"
  on public.daily_report_manpower
  for insert
  to authenticated
  with check (public.can_access_daily_report(daily_report_id));

create policy "Members can update report manpower"
  on public.daily_report_manpower
  for update
  to authenticated
  using (public.can_access_daily_report(daily_report_id))
  with check (public.can_access_daily_report(daily_report_id));

create policy "Members can delete report manpower"
  on public.daily_report_manpower
  for delete
  to authenticated
  using (public.can_access_daily_report(daily_report_id));

create policy "Members can view report materials"
  on public.daily_report_materials
  for select
  to authenticated
  using (public.can_access_daily_report(daily_report_id));

create policy "Members can create report materials"
  on public.daily_report_materials
  for insert
  to authenticated
  with check (public.can_access_daily_report(daily_report_id));

create policy "Members can update report materials"
  on public.daily_report_materials
  for update
  to authenticated
  using (public.can_access_daily_report(daily_report_id))
  with check (public.can_access_daily_report(daily_report_id));

create policy "Members can delete report materials"
  on public.daily_report_materials
  for delete
  to authenticated
  using (public.can_access_daily_report(daily_report_id));

create policy "Members can view business site photos"
  on public.site_photos
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can upload business site photos"
  on public.site_photos
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
    and (
      daily_report_id is null
      or public.daily_report_matches_scope(
        daily_report_id,
        project_id,
        business_id
      )
    )
  );

create policy "Members can update business site photos"
  on public.site_photos
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
    and (
      daily_report_id is null
      or public.daily_report_matches_scope(
        daily_report_id,
        project_id,
        business_id
      )
    )
  );

create policy "Members can delete business site photos"
  on public.site_photos
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
  'site-photos',
  'site-photos',
  false,
  15728640,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Business members can upload site photos" on storage.objects;
drop policy if exists "Business members can read site photos" on storage.objects;
drop policy if exists "Business members can update site photos" on storage.objects;
drop policy if exists "Business members can delete site photos" on storage.objects;

create policy "Business members can upload site photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'site-photos'
    and public.is_site_photo_member(name)
  );

create policy "Business members can read site photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'site-photos'
    and public.is_site_photo_member(name)
  );

create policy "Business members can update site photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'site-photos'
    and public.is_site_photo_member(name)
  )
  with check (
    bucket_id = 'site-photos'
    and public.is_site_photo_member(name)
  );

create policy "Business members can delete site photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'site-photos'
    and public.is_site_photo_member(name)
  );

notify pgrst, 'reload schema';
