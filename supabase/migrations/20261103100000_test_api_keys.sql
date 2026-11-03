create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  key_prefix text not null,
  key_hash text not null unique check (key_hash ~ '^[a-f0-9]{64}$'),
  environment text not null default 'test' check (environment = 'test'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index api_keys_owner_created_idx on public.api_keys (owner_id, created_at desc);

alter table public.api_keys enable row level security;
revoke all on table public.api_keys from anon, authenticated;
grant select (id, name, key_prefix, environment, created_at, last_used_at, revoked_at)
  on table public.api_keys to authenticated;

create policy "Users can read their own API key metadata"
  on public.api_keys for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.create_test_api_key(
  p_name text,
  p_key_prefix text,
  p_key_hash text
)
returns table (id uuid, name text, key_prefix text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(p_name)) not between 1 and 60 then
    raise exception 'Key name must contain 1 to 60 characters';
  end if;
  if p_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid key hash';
  end if;

  return query
    insert into public.api_keys (owner_id, name, key_prefix, key_hash, environment)
    values (current_user_id, trim(p_name), p_key_prefix, p_key_hash, 'test')
    returning public.api_keys.id, public.api_keys.name, public.api_keys.key_prefix, public.api_keys.created_at;
end;
$$;

revoke all on function public.create_test_api_key(text, text, text) from public, anon;
grant execute on function public.create_test_api_key(text, text, text) to authenticated;

create or replace function public.revoke_test_api_key(p_key_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.api_keys
  set revoked_at = now()
  where id = p_key_id
    and owner_id = auth.uid()
    and environment = 'test'
    and revoked_at is null;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.revoke_test_api_key(uuid) from public, anon;
grant execute on function public.revoke_test_api_key(uuid) to authenticated;

create or replace function public.validate_test_api_key(p_key_hash text)
returns table (owner_id uuid, key_id uuid)
language sql
security definer
set search_path = ''
as $$
  update public.api_keys as api_key
  set last_used_at = now()
  where api_key.key_hash = p_key_hash
    and api_key.environment = 'test'
    and api_key.revoked_at is null
  returning api_key.owner_id, api_key.id;
$$;

revoke all on function public.validate_test_api_key(text) from public;
grant execute on function public.validate_test_api_key(text) to anon, authenticated;
