-- BuildPilot custom email OTP for signup verification (SMTP-delivered).
-- Accessible only via service role (RLS enabled, no anon/authenticated policies).

create table if not exists public.email_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint email_otps_attempts_non_negative check (attempts >= 0)
);

create index if not exists email_otps_user_id_idx
  on public.email_otps (user_id);

create index if not exists email_otps_email_active_idx
  on public.email_otps (lower(email))
  where consumed_at is null;

create index if not exists email_otps_expires_at_idx
  on public.email_otps (expires_at);

alter table public.email_otps enable row level security;

revoke all on table public.email_otps from anon;
revoke all on table public.email_otps from authenticated;
grant select, insert, update, delete on table public.email_otps to service_role;

notify pgrst, 'reload schema';
