-- Application-scoped resources and monthly collection fees.
-- Existing account data is assigned to a default app so it remains visible.

create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  website text,
  category text not null check (char_length(trim(category)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists apps_owner_created_idx on public.apps(owner_id, created_at);

alter table public.apps enable row level security;
revoke all on public.apps from anon, authenticated;
grant select, insert, update, delete on public.apps to authenticated;
drop policy if exists apps_select_own on public.apps;
drop policy if exists apps_insert_own on public.apps;
drop policy if exists apps_update_own on public.apps;
drop policy if exists apps_delete_own on public.apps;
create policy apps_select_own on public.apps for select to authenticated using (owner_id = (select auth.uid()));
create policy apps_insert_own on public.apps for insert to authenticated with check (owner_id = (select auth.uid()));
create policy apps_update_own on public.apps for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy apps_delete_own on public.apps for delete to authenticated using (owner_id = (select auth.uid()));

alter table public.api_keys add column if not exists app_id uuid references public.apps(id) on delete cascade;
alter table public.transactions add column if not exists app_id uuid references public.apps(id) on delete set null;
alter table public.wallets add column if not exists app_id uuid references public.apps(id) on delete cascade;
alter table public.wallet_movements add column if not exists app_id uuid references public.apps(id) on delete cascade;
alter table public.subscriptions add column if not exists app_id uuid references public.apps(id) on delete cascade;

-- Keep existing users' data available inside an automatically-created app.
insert into public.apps(owner_id, name, category)
select u.id, 'Mon application', 'Autre'
from auth.users as u
where not exists (select 1 from public.apps as a where a.owner_id = u.id);

update public.api_keys as k set app_id = a.id
from public.apps as a where k.app_id is null and a.owner_id = k.owner_id;
update public.transactions as t set app_id = a.id
from public.apps as a where t.app_id is null and a.owner_id = t.owner_id;
update public.wallets as w set app_id = a.id
from public.apps as a where w.app_id is null and a.owner_id = w.owner_id;
update public.wallet_movements as m set app_id = a.id
from public.apps as a where m.app_id is null and a.owner_id = m.owner_id;
update public.subscriptions as s set app_id = a.id
from public.apps as a where s.app_id is null and a.owner_id = s.owner_id;

create index if not exists api_keys_app_created_idx on public.api_keys(app_id, created_at desc);
create index if not exists transactions_app_created_idx on public.transactions(app_id, created_at desc);
create index if not exists wallets_app_currency_idx on public.wallets(app_id, currency_code);
create index if not exists wallet_movements_app_created_idx on public.wallet_movements(app_id, created_at desc);

create or replace function public.create_api_key_for_app(
  p_app_id uuid,
  p_name text,
  p_key_prefix text,
  p_key_hash text,
  p_environment text default 'test'
)
returns table(id uuid, name text, key_prefix text, environment text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
begin
  if v_owner is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if char_length(trim(p_name)) not between 1 and 60 then raise exception 'INVALID_KEY_NAME'; end if;
  if p_environment not in ('test', 'live') then raise exception 'INVALID_ENVIRONMENT'; end if;
  if p_key_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_KEY_HASH'; end if;
  if not exists(select 1 from public.apps a where a.id = p_app_id and a.owner_id = v_owner) then
    raise exception 'APP_NOT_FOUND';
  end if;
  if p_environment = 'live' and not exists(select 1 from public.profiles p where p.id = v_owner and p.verification_status = 'verified') then
    raise exception 'ACCOUNT_NOT_VERIFIED';
  end if;
  return query insert into public.api_keys(owner_id, app_id, name, key_prefix, key_hash, environment)
    values(v_owner, p_app_id, trim(p_name), p_key_prefix, p_key_hash, p_environment)
    returning public.api_keys.id, public.api_keys.name, public.api_keys.key_prefix, public.api_keys.environment, public.api_keys.created_at;
end;
$$;
revoke all on function public.create_api_key_for_app(uuid,text,text,text,text) from public, anon;
grant execute on function public.create_api_key_for_app(uuid,text,text,text,text) to authenticated;

-- Apply the subscription's tiered collection fee to an already-recorded transaction.
-- This is server-only and leaves all existing live-payment and API-key checks in place.
create or replace function public.apply_app_collection_fee(p_key_hash text, p_transaction_id text)
returns table(out_app_id uuid, out_platform_fee numeric, out_net_payable numeric, out_rate numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key record;
  v_tx record;
  v_plan text;
  v_cap numeric := 0;
  v_used numeric := 0;
  v_low_tier numeric := 0;
  v_fee numeric := 0;
  v_rate numeric := 6;
begin
  select k.owner_id, k.app_id into v_key
  from public.api_keys k
  where k.key_hash = p_key_hash and k.revoked_at is null;
  if not found or v_key.app_id is null then raise exception 'INVALID_KEY_OR_APP'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_key.app_id::text, 0));

  select t.id, t.owner_id, t.app_id, t.amount, t.currency_code, t.purpose, t.status
    into v_tx
  from public.transactions t
  where t.transaction_id = p_transaction_id and t.owner_id = v_key.owner_id
  for update;
  if not found then raise exception 'UNKNOWN_TRANSACTION'; end if;
  if v_tx.purpose = 'subscription' then
    return query select v_tx.app_id, 0::numeric, v_tx.amount, 0::numeric;
    return;
  end if;
  if v_tx.status not in ('pending', 'successful') then raise exception 'INVALID_TRANSACTION_STATUS'; end if;

  select s.plan into v_plan
  from public.subscriptions s
  where s.owner_id = v_tx.owner_id and s.app_id = v_tx.app_id and s.current_period_end > now()
  order by s.current_period_end desc limit 1;

  if v_tx.currency_code in ('XAF', 'XOF') and v_plan in ('basic', 'premium') then
    v_cap := case when v_plan = 'basic' then 200000 else 500000 end;
    select coalesce(sum(t.amount), 0) into v_used
    from public.transactions t
    where t.owner_id = v_tx.owner_id
      and t.app_id = v_tx.app_id
      and t.currency_code in ('XAF', 'XOF')
      and t.status in ('pending', 'successful')
      and coalesce(t.purpose, '') <> 'subscription'
      and t.created_at >= date_trunc('month', now())
      and t.id <> v_tx.id;
    v_low_tier := greatest(0, least(v_tx.amount, v_cap - v_used));
    v_fee := round(v_low_tier * 0.01 + (v_tx.amount - v_low_tier) * 0.06, 2);
    v_rate := case when v_tx.amount > 0 then round(v_fee * 100 / v_tx.amount, 4) else 6 end;
  else
    v_fee := round(v_tx.amount * 0.06, 2);
    v_rate := 6;
  end if;

  update public.transactions
  set app_id = v_tx.app_id,
      processing_fee = v_fee,
      net_payable = greatest(0, v_tx.amount - v_fee),
      updated_at = now()
  where id = v_tx.id;

  return query select v_tx.app_id, v_fee, greatest(0, v_tx.amount - v_fee), v_rate;
end;
$$;
revoke all on function public.apply_app_collection_fee(text,text) from public, anon, authenticated;
grant execute on function public.apply_app_collection_fee(text,text) to service_role;
