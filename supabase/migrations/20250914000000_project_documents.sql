create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  uploaded_by uuid not null references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_documents_project_business
  on public.project_documents (project_id, business_id, created_at desc);

alter table public.project_documents enable row level security;

create policy "Members can view project documents"
  on public.project_documents
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "Members can insert project documents"
  on public.project_documents
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
    and uploaded_by = auth.uid()
  );

create policy "Members can update project documents"
  on public.project_documents
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and public.project_belongs_to_business(project_id, business_id)
  );

create policy "Members can delete project documents"
  on public.project_documents
  for delete
  to authenticated
  using (public.is_business_member(business_id));

create or replace function public.is_project_document_member(object_name text)
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

revoke all on function public.is_project_document_member(text) from public, anon;
grant execute on function public.is_project_document_member(text) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-documents',
  'project-documents',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Business members can upload project documents"
  on storage.objects;
drop policy if exists "Business members can read project documents"
  on storage.objects;
drop policy if exists "Business members can update project documents"
  on storage.objects;
drop policy if exists "Business members can delete project documents"
  on storage.objects;

create policy "Business members can upload project documents"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-documents'
    and public.is_project_document_member(name)
  );

create policy "Business members can read project documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.is_project_document_member(name)
  );

create policy "Business members can update project documents"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.is_project_document_member(name)
  )
  with check (
    bucket_id = 'project-documents'
    and public.is_project_document_member(name)
  );

create policy "Business members can delete project documents"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-documents'
    and public.is_project_document_member(name)
  );

notify pgrst, 'reload schema';
