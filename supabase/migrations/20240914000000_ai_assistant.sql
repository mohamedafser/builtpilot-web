-- BuildPilot Phase 10: AI construction assistant.
-- Run after 20240913231000_client_portal_resolve_last_accessed.sql.
--
-- Conversations and messages are scoped to a business and owned by the
-- user who created them. Project-linked chats must belong to that business.
-- AI provider keys are never stored here.

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_conversations_title_length
    check (char_length(btrim(title)) between 1 and 120)
);

create index ai_conversations_business_id_idx
  on public.ai_conversations (business_id);
create index ai_conversations_user_id_idx
  on public.ai_conversations (user_id);
create index ai_conversations_project_id_idx
  on public.ai_conversations (project_id);
create index ai_conversations_updated_at_idx
  on public.ai_conversations (updated_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint ai_messages_role_check check (role in ('user', 'assistant')),
  constraint ai_messages_content_length
    check (char_length(content) between 1 and 20000)
);

create index ai_messages_conversation_id_idx
  on public.ai_messages (conversation_id);
create index ai_messages_conversation_created_at_idx
  on public.ai_messages (conversation_id, created_at);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  constraint ai_usage_model_length check (char_length(model) between 1 and 120),
  constraint ai_usage_tokens_non_negative check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
  )
);

create index ai_usage_business_id_idx on public.ai_usage (business_id);
create index ai_usage_user_id_idx on public.ai_usage (user_id);
create index ai_usage_created_at_idx on public.ai_usage (created_at desc);

create trigger set_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create or replace function public.prevent_ai_conversation_scope_mismatch()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is not null
     and not public.project_belongs_to_business(new.project_id, new.business_id) then
    raise exception 'AI conversation project must belong to the same business';
  end if;

  return new;
end;
$$;

create trigger prevent_ai_conversation_scope_mismatch
  before insert or update on public.ai_conversations
  for each row execute function public.prevent_ai_conversation_scope_mismatch();

create or replace function public.prevent_ai_conversation_illegal_update()
returns trigger
language plpgsql
as $$
begin
  if new.business_id is distinct from old.business_id
     or new.user_id is distinct from old.user_id then
    raise exception 'AI conversation owner cannot be changed';
  end if;

  return new;
end;
$$;

create trigger prevent_ai_conversation_illegal_update
  before update on public.ai_conversations
  for each row execute function public.prevent_ai_conversation_illegal_update();

create or replace function public.prevent_ai_message_scope_mismatch()
returns trigger
language plpgsql
as $$
declare
  parent public.ai_conversations%rowtype;
begin
  select *
    into parent
  from public.ai_conversations
  where id = new.conversation_id;

  if parent.id is null
     or parent.business_id is distinct from new.business_id then
    raise exception 'AI message must belong to the same business as its conversation';
  end if;

  return new;
end;
$$;

create trigger prevent_ai_message_scope_mismatch
  before insert or update on public.ai_messages
  for each row execute function public.prevent_ai_message_scope_mismatch();

create or replace function public.prevent_ai_message_illegal_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AI messages cannot be edited';
end;
$$;

create trigger prevent_ai_message_illegal_update
  before update on public.ai_messages
  for each row execute function public.prevent_ai_message_illegal_update();

create or replace function public.prevent_ai_usage_illegal_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AI usage records cannot be edited';
end;
$$;

create trigger prevent_ai_usage_illegal_update
  before update on public.ai_usage
  for each row execute function public.prevent_ai_usage_illegal_update();

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage enable row level security;

create policy "Members can view their AI conversations"
  on public.ai_conversations
  for select
  to authenticated
  using (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  );

create policy "Members can insert their AI conversations"
  on public.ai_conversations
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and user_id = auth.uid()
    and (
      project_id is null
      or public.project_belongs_to_business(project_id, business_id)
    )
  );

create policy "Members can update their AI conversations"
  on public.ai_conversations
  for update
  to authenticated
  using (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  )
  with check (
    public.is_business_member(business_id)
    and user_id = auth.uid()
    and (
      project_id is null
      or public.project_belongs_to_business(project_id, business_id)
    )
  );

create policy "Members can delete their AI conversations"
  on public.ai_conversations
  for delete
  to authenticated
  using (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  );

create policy "Members can view messages in their AI conversations"
  on public.ai_messages
  for select
  to authenticated
  using (
    public.is_business_member(business_id)
    and exists (
      select 1
      from public.ai_conversations as conversation
      where conversation.id = ai_messages.conversation_id
        and conversation.business_id = ai_messages.business_id
        and conversation.user_id = auth.uid()
    )
  );

create policy "Members can insert messages in their AI conversations"
  on public.ai_messages
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and exists (
      select 1
      from public.ai_conversations as conversation
      where conversation.id = ai_messages.conversation_id
        and conversation.business_id = ai_messages.business_id
        and conversation.user_id = auth.uid()
    )
  );

create policy "Members can delete messages in their AI conversations"
  on public.ai_messages
  for delete
  to authenticated
  using (
    public.is_business_member(business_id)
    and exists (
      select 1
      from public.ai_conversations as conversation
      where conversation.id = ai_messages.conversation_id
        and conversation.business_id = ai_messages.business_id
        and conversation.user_id = auth.uid()
    )
  );

create policy "Members can view their AI usage"
  on public.ai_usage
  for select
  to authenticated
  using (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  );

create policy "Members can insert their AI usage"
  on public.ai_usage
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and user_id = auth.uid()
  );

revoke all on table public.ai_conversations from anon, public;
revoke all on table public.ai_messages from anon, public;
revoke all on table public.ai_usage from anon, public;

grant select, insert, update, delete on table public.ai_conversations
  to authenticated;
grant select, insert, delete on table public.ai_messages
  to authenticated;
grant select, insert on table public.ai_usage
  to authenticated;

notify pgrst, 'reload schema';
