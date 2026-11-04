-- Retraits, conversions, abonnements et rôle administrateur.
-- Toute la logique d'argent est ici, côté base de données, pour ne pas pouvoir être contournée.

-- 1. Rôle administrateur : mis à true à la main par toi, dans Supabase. Jamais modifiable depuis l'application.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_flashpay_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles as p where p.id = (select auth.uid())), false);
$$;

-- 2. Abonnements (en FCFA, par mois).
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  plan text not null check (plan in ('basic', 'premium')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_owner_idx on public.subscriptions (owner_id, current_period_end desc);

alter table public.subscriptions enable row level security;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (owner_id = (select auth.uid()));
revoke all on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;

-- Plan actif du client, ou null.
create or replace function public.active_plan(p_owner uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.plan
  from public.subscriptions as s
  where s.owner_id = p_owner and s.current_period_end > now()
  order by s.current_period_end desc
  limit 1;
$$;

-- L'admin active ou prolonge un abonnement après paiement reçu (virement ou collecte).
create or replace function public.admin_activate_subscription(p_owner uuid, p_plan text, p_months integer default 1)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
begin
  if not public.is_flashpay_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  if p_plan not in ('basic', 'premium') or p_months < 1 then
    raise exception 'INVALID_SUBSCRIPTION';
  end if;

  select greatest(now(), coalesce(max(s.current_period_end), now()))
    into v_start
  from public.subscriptions as s
  where s.owner_id = p_owner;

  insert into public.subscriptions (owner_id, plan, current_period_end)
  values (p_owner, p_plan, v_start + make_interval(months => p_months));

  return 'ACTIVATED';
end;
$$;

-- 3. Taux de change fixés par l'admin, et minimum de retrait par devise (1 USD converti).
create table if not exists public.fx_rates (
  from_currency text not null check (from_currency ~ '^[A-Z]{3}$'),
  to_currency text not null check (to_currency ~ '^[A-Z]{3}$'),
  rate numeric(20, 6) not null check (rate > 0),
  updated_at timestamptz not null default now(),
  primary key (from_currency, to_currency)
);

create table if not exists public.withdrawal_minimums (
  currency_code text primary key check (currency_code ~ '^[A-Z]{3}$'),
  minimum_amount numeric(20, 2) not null check (minimum_amount > 0),
  updated_at timestamptz not null default now()
);

alter table public.fx_rates enable row level security;
alter table public.withdrawal_minimums enable row level security;
revoke all on table public.fx_rates from anon, authenticated;
revoke all on table public.withdrawal_minimums from anon, authenticated;
grant select on table public.fx_rates to authenticated;
grant select on table public.withdrawal_minimums to authenticated;
create policy "fx_rates_read" on public.fx_rates for select to authenticated using (true);
create policy "withdrawal_minimums_read" on public.withdrawal_minimums for select to authenticated using (true);

-- 4. Demandes de retrait.
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  requested_amount numeric(20, 2) not null check (requested_amount > 0),
  fee_rate numeric(5, 2) not null,
  fee_amount numeric(20, 2) not null check (fee_amount >= 0),
  payout_amount numeric(20, 2) not null check (payout_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests (status, created_at);

alter table public.withdrawal_requests enable row level security;
create policy "withdrawal_requests_select_own" on public.withdrawal_requests
  for select to authenticated using (owner_id = (select auth.uid()));
revoke all on table public.withdrawal_requests from anon, authenticated;
grant select on table public.withdrawal_requests to authenticated;

-- Le client demande un retrait. Frais : 5 %, ou 0 % avec l'abonnement Premium.
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
  v_rate numeric;
  v_fee numeric;
  v_payout numeric;
  v_id uuid;
begin
  if v_owner is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select wm.minimum_amount into v_minimum
  from public.withdrawal_minimums as wm
  where wm.currency_code = p_currency;
  if v_minimum is null then
    raise exception 'MINIMUM_NOT_CONFIGURED';
  end if;
  if p_amount < v_minimum then
    raise exception 'BELOW_MINIMUM';
  end if;

  select w.balance into v_balance
  from public.wallets as w
  where w.owner_id = v_owner and w.currency_code = p_currency;
  if v_balance is null or v_balance < p_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  v_rate := case when public.active_plan(v_owner) = 'premium' then 0 else 5 end;
  v_fee := round(p_amount * v_rate / 100, 2);
  v_payout := p_amount - v_fee;

  insert into public.withdrawal_requests (owner_id, currency_code, requested_amount, fee_rate, fee_amount, payout_amount)
  values (v_owner, p_currency, p_amount, v_rate, v_fee, v_payout)
  returning id into v_id;

  return query select v_id, v_fee, v_payout, 'pending'::text;
end;
$$;

-- L'admin marque le retrait comme payé après l'avoir envoyé manuellement. Le solde est alors débité.
create or replace function public.admin_mark_withdrawal_paid(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req record;
  v_wallet record;
begin
  if not public.is_flashpay_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  select * into v_req from public.withdrawal_requests as r where r.id = p_id for update;
  if not found then
    return 'UNKNOWN_REQUEST';
  end if;
  if v_req.status <> 'pending' then
    return 'ALREADY_PROCESSED';
  end if;

  select * into v_wallet from public.wallets as w
  where w.owner_id = v_req.owner_id and w.currency_code = v_req.currency_code
  for update;
  if not found or v_wallet.balance < v_req.requested_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  update public.wallets
  set balance = balance - v_req.requested_amount, updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_movements (owner_id, wallet_id, currency_code, kind, amount, balance_after, reference)
  values (v_req.owner_id, v_wallet.id, v_req.currency_code, 'withdrawal', -v_req.requested_amount,
          v_wallet.balance - v_req.requested_amount, 'withdrawal:' || v_req.id::text);

  update public.withdrawal_requests
  set status = 'paid', processed_at = now()
  where id = v_req.id;

  return 'PAID';
end;
$$;

create or replace function public.admin_reject_withdrawal(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_flashpay_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  update public.withdrawal_requests
  set status = 'rejected', processed_at = now()
  where id = p_id and status = 'pending';
  return case when found then 'REJECTED' else 'NOT_PENDING' end;
end;
$$;

-- 5. Conversions entre devises. Frais : 4,5 % (1 % pour les abonnés), inclus dans l'écart de change.
create table if not exists public.conversion_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  from_currency text not null check (from_currency ~ '^[A-Z]{3}$'),
  to_currency text not null check (to_currency ~ '^[A-Z]{3}$'),
  amount numeric(20, 2) not null check (amount > 0),
  fee_rate numeric(5, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'rejected')),
  rate_applied numeric(20, 6),
  received_amount numeric(20, 2),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.conversion_requests enable row level security;
create policy "conversion_requests_select_own" on public.conversion_requests
  for select to authenticated using (owner_id = (select auth.uid()));
revoke all on table public.conversion_requests from anon, authenticated;
grant select on table public.conversion_requests to authenticated;

create or replace function public.request_conversion(p_from text, p_to text, p_amount numeric)
returns table (out_id uuid, out_fee_rate numeric, out_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_balance numeric;
  v_rate numeric;
  v_id uuid;
begin
  if v_owner is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_from = p_to or p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_CONVERSION';
  end if;

  select w.balance into v_balance
  from public.wallets as w
  where w.owner_id = v_owner and w.currency_code = p_from;
  if v_balance is null or v_balance < p_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  v_rate := case when public.active_plan(v_owner) is not null then 1 else 4.5 end;

  insert into public.conversion_requests (owner_id, from_currency, to_currency, amount, fee_rate)
  values (v_owner, p_from, p_to, p_amount, v_rate)
  returning id into v_id;

  return query select v_id, v_rate, 'pending'::text;
end;
$$;

-- L'admin exécute la conversion avec le taux qu'il fixe. Le solde source est débité, le solde cible crédité net de frais.
create or replace function public.admin_complete_conversion(p_id uuid, p_rate numeric)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req record;
  v_src record;
  v_received numeric;
  v_dst_id uuid;
  v_dst_balance numeric;
begin
  if not public.is_flashpay_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  if p_rate is null or p_rate <= 0 then
    raise exception 'INVALID_RATE';
  end if;

  select * into v_req from public.conversion_requests as c where c.id = p_id for update;
  if not found then
    return 'UNKNOWN_REQUEST';
  end if;
  if v_req.status <> 'pending' then
    return 'ALREADY_PROCESSED';
  end if;

  select * into v_src from public.wallets as w
  where w.owner_id = v_req.owner_id and w.currency_code = v_req.from_currency
  for update;
  if not found or v_src.balance < v_req.amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  v_received := round(v_req.amount * p_rate * (1 - v_req.fee_rate / 100), 2);

  update public.wallets set balance = balance - v_req.amount, updated_at = now() where id = v_src.id;
  insert into public.wallet_movements (owner_id, wallet_id, currency_code, kind, amount, balance_after, reference)
  values (v_req.owner_id, v_src.id, v_req.from_currency, 'conversion_out', -v_req.amount,
          v_src.balance - v_req.amount, 'conversion_out:' || v_req.id::text);

  insert into public.wallets (owner_id, currency_code, balance)
  values (v_req.owner_id, v_req.to_currency, 0)
  on conflict (owner_id, currency_code) do nothing;

  select w.id into v_dst_id from public.wallets as w
  where w.owner_id = v_req.owner_id and w.currency_code = v_req.to_currency
  for update;

  update public.wallets set balance = balance + v_received, updated_at = now()
  where id = v_dst_id
  returning balance into v_dst_balance;

  insert into public.wallet_movements (owner_id, wallet_id, currency_code, kind, amount, balance_after, reference)
  values (v_req.owner_id, v_dst_id, v_req.to_currency, 'conversion_in', v_received,
          v_dst_balance, 'conversion_in:' || v_req.id::text);

  update public.conversion_requests
  set status = 'done', rate_applied = p_rate, received_amount = v_received, processed_at = now()
  where id = v_req.id;

  return 'DONE';
end;
$$;

-- Droits d'exécution : seuls les utilisateurs connectés peuvent demander ; les fonctions admin vérifient is_admin.
revoke all on function public.is_flashpay_admin() from public, anon;
revoke all on function public.active_plan(uuid) from public, anon, authenticated;
revoke all on function public.admin_activate_subscription(uuid, text, integer) from public, anon;
revoke all on function public.request_withdrawal(text, numeric) from public, anon;
revoke all on function public.admin_mark_withdrawal_paid(uuid) from public, anon;
revoke all on function public.admin_reject_withdrawal(uuid) from public, anon;
revoke all on function public.request_conversion(text, text, numeric) from public, anon;
revoke all on function public.admin_complete_conversion(uuid, numeric) from public, anon;

grant execute on function public.is_flashpay_admin() to authenticated;
grant execute on function public.admin_activate_subscription(uuid, text, integer) to authenticated;
grant execute on function public.request_withdrawal(text, numeric) to authenticated;
grant execute on function public.admin_mark_withdrawal_paid(uuid) to authenticated;
grant execute on function public.admin_reject_withdrawal(uuid) to authenticated;
grant execute on function public.request_conversion(text, text, numeric) to authenticated;
grant execute on function public.admin_complete_conversion(uuid, numeric) to authenticated;
