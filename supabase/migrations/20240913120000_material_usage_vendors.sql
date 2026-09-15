-- Allow vendors on material usage as well as receipts.
-- Run after 20240913100000_project_vendors.sql.

alter table public.material_transactions
  drop constraint if exists material_transactions_vendor_received_only;

alter table public.material_transactions
  add constraint material_transactions_vendor_received_or_used check (
    vendor_id is null
    or transaction_type in ('received', 'used')
  );
