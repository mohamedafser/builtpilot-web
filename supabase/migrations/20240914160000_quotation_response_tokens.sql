-- Quotation client response tokens for accept/reject links in email.

alter table public.quotations
  add column if not exists response_token_hash text,
  add column if not exists response_token_created_at timestamptz;

comment on column public.quotations.response_token_hash is
  'SHA-256 hex of the one-time client response token emailed with the quotation.';
comment on column public.quotations.response_token_created_at is
  'When the client response token was issued (on send).';

create unique index if not exists quotations_response_token_hash_uidx
  on public.quotations (response_token_hash)
  where response_token_hash is not null;

-- Allow clearing the response token while an accepted quotation is otherwise locked.
create or replace function public.prevent_quotation_illegal_update()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.created_by is distinct from old.created_by
     or new.quotation_number is distinct from old.quotation_number then
    raise exception 'Cannot change quotation business, creator, or number';
  end if;

  if old.project_id is not null
     and new.project_id is distinct from old.project_id then
    raise exception 'Cannot change a linked quotation project';
  end if;

  if old.status = 'accepted' then
    if new.status is distinct from old.status then
      raise exception 'Accepted quotations cannot change status';
    end if;

    if new.subtotal is distinct from old.subtotal
       or new.discount_type is distinct from old.discount_type
       or new.discount_value is distinct from old.discount_value
       or new.discount_amount is distinct from old.discount_amount
       or new.tax_percentage is distinct from old.tax_percentage
       or new.tax_amount is distinct from old.tax_amount
       or new.total_amount is distinct from old.total_amount
       or new.title is distinct from old.title
       or new.client_name is distinct from old.client_name
       or new.client_phone is distinct from old.client_phone
       or new.client_email is distinct from old.client_email
       or new.client_address is distinct from old.client_address
       or new.quotation_date is distinct from old.quotation_date
       or new.valid_until is distinct from old.valid_until
       or new.notes is distinct from old.notes
       or new.terms is distinct from old.terms then
      raise exception 'Accepted quotations cannot be edited';
    end if;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'draft' and new.status not in ('sent', 'cancelled') then
      raise exception 'Invalid quotation status change';
    end if;

    if old.status = 'sent' and new.status not in ('accepted', 'rejected', 'cancelled') then
      raise exception 'Invalid quotation status change';
    end if;

    if old.status in ('rejected', 'expired', 'cancelled') then
      raise exception 'Invalid quotation status change';
    end if;
  end if;

  return new;
end;
$$;
