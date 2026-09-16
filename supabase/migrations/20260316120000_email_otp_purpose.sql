-- Distinguish signup vs password-reset OTPs.
alter table public.email_otps
  add column if not exists purpose text not null default 'signup';

alter table public.email_otps
  drop constraint if exists email_otps_purpose_check;

alter table public.email_otps
  add constraint email_otps_purpose_check
  check (purpose in ('signup', 'password_reset'));

create index if not exists email_otps_user_purpose_active_idx
  on public.email_otps (user_id, purpose)
  where consumed_at is null;

notify pgrst, 'reload schema';
