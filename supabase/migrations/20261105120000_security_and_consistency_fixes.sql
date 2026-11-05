-- 20261105120000_security_and_consistency_fixes.sql
-- Idempotent. Ne modifie pas les migrations existantes.

-- 1. Profil créé automatiquement à l'inscription, et interdiction de s'auto-attribuer is_admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "Users can create a pending own profile" on public.profiles;
create policy "Users can create a pending own profile"
  on public.profiles for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and verification_status = 'pending'
    and is_admin = false
  );

-- 2. Autoriser les clés live
alter table public.api_keys drop constraint if exists api_keys_environment_check;
alter table public.api_keys
  add constraint api_keys_environment_check check (environment in ('test', 'live'));

-- 3. Validation de clé réservée au serveur
revoke execute on function public.validate_test_api_key(text) from anon;

-- 4. Verrou par marchand sur les retraits, pour éviter les doubles demandes
create or replace function public.request_withdrawal(p_currency text, p_amount numeric)
returns table (out_id uuid, out_fee numeric, out_payout numeric, out_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_balance numeric;
  v_minimum numeric;
  v_plan text;
  v_rate numeric;
  v_fee numeric;
  v_payout numeric;
  v_collected numeric;
  v_withdrawn numeric;
  v_id uuid;
begin
  if v_owner is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  perform pg_advisory_xact_lock(hashtextextended('withdrawal:' || v_owner::text, 0));

  select wm.minimum_amount into v_minimum
  from public.withdrawal_minimums as wm where wm.currency_code = p_currency;
  if v_minimum is null then raise exception 'MINIMUM_NOT_CONFIGURED'; end if;
  if p_amount < v_minimum then raise exception 'BELOW_MINIMUM'; end if;

  select w.balance into v_balance
  from public.wallets as w
  where w.owner_id = v_owner and w.currency_code = p_currency
  for update;
  if v_balance is null or v_balance < p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;

  v_plan := public.active_plan(v_owner);

  if v_plan = 'premium' and p_currency in ('XAF', 'XOF') then
    select u.out_collected, u.out_withdrawn into v_collected, v_withdrawn
    from public.monthly_fcfa_usage(v_owner) as u;
    if v_collected + v_withdrawn + p_amount > 500000 then raise exception 'CAP_REACHED'; end if;
  end if;

  v_rate := case when v_plan = 'premium' then 0 else 5 end;
  v_fee := round(p_amount * v_rate / 100, 2);
  v_payout := p_amount - v_fee;

  insert into public.withdrawal_requests (owner_id, currency_code, requested_amount, fee_rate, fee_amount, payout_amount)
  values (v_owner, p_currency, p_amount, v_rate, v_fee, v_payout)
  returning id into v_id;

  return query select v_id, v_fee, v_payout, 'pending'::text;
end;
$$;

-- 5. Verrou par marchand sur le contrôle de plafond (volatile, car il pose un verrou)
create or replace function public.check_collection_cap(p_owner uuid, p_amount numeric, p_currency text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_collected numeric;
  v_withdrawn numeric;
begin
  if p_currency not in ('XAF', 'XOF') then return 'OK'; end if;

  perform pg_advisory_xact_lock(hashtextextended('collection:' || p_owner::text, 0));

  v_plan := public.active_plan(p_owner);
  select u.out_collected, u.out_withdrawn into v_collected, v_withdrawn
  from public.monthly_fcfa_usage(p_owner) as u;

  if v_plan = 'basic' and v_collected + p_amount > 200000 then return 'CAP_REACHED'; end if;
  if v_plan = 'premium' and v_collected + v_withdrawn + p_amount > 500000 then return 'CAP_REACHED'; end if;
  return 'OK';
end;
$$;

revoke all on function public.check_collection_cap(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.check_collection_cap(uuid, numeric, text) to service_role;
