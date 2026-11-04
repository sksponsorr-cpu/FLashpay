-- Plafonds mensuels des abonnements, en FCFA (XAF et XOF, 1 pour 1).
-- Basic : 200 000 FCFA encaissés par mois.
-- Premium : 500 000 FCFA par mois, encaissements et retraits cumulés.
-- Les devises hors XAF/XOF ne sont pas plafonnées ici : le plafond est défini en FCFA.

-- Montants du mois en cours, en FCFA.
create or replace function public.monthly_fcfa_usage(p_owner uuid)
returns table (out_collected numeric, out_withdrawn numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((
      select sum(t.amount)
      from public.transactions as t
      where t.owner_id = p_owner
        and t.currency_code in ('XAF', 'XOF')
        and t.status in ('pending', 'successful')
        and t.created_at >= date_trunc('month', now())
    ), 0) as out_collected,
    coalesce((
      select sum(r.requested_amount)
      from public.withdrawal_requests as r
      where r.owner_id = p_owner
        and r.currency_code in ('XAF', 'XOF')
        and r.status in ('pending', 'paid')
        and r.created_at >= date_trunc('month', now())
    ), 0) as out_withdrawn;
$$;

-- Vérifie qu'une nouvelle collecte reste sous le plafond du plan actif.
-- Réservé au serveur (clé service role). Retourne 'OK' ou 'CAP_REACHED'.
create or replace function public.check_collection_cap(p_owner uuid, p_amount numeric, p_currency text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan text := public.active_plan(p_owner);
  v_collected numeric;
  v_withdrawn numeric;
begin
  if p_currency not in ('XAF', 'XOF') then
    return 'OK';
  end if;

  select u.out_collected, u.out_withdrawn into v_collected, v_withdrawn
  from public.monthly_fcfa_usage(p_owner) as u;

  if v_plan = 'basic' and v_collected + p_amount > 200000 then
    return 'CAP_REACHED';
  end if;
  if v_plan = 'premium' and v_collected + v_withdrawn + p_amount > 500000 then
    return 'CAP_REACHED';
  end if;
  return 'OK';
end;
$$;

-- Retrait : même logique que la migration 190000, avec le plafond Premium en plus.
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

  v_plan := public.active_plan(v_owner);

  if v_plan = 'premium' and p_currency in ('XAF', 'XOF') then
    select u.out_collected, u.out_withdrawn into v_collected, v_withdrawn
    from public.monthly_fcfa_usage(v_owner) as u;
    if v_collected + v_withdrawn + p_amount > 500000 then
      raise exception 'CAP_REACHED';
    end if;
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

revoke all on function public.monthly_fcfa_usage(uuid) from public, anon, authenticated;
revoke all on function public.check_collection_cap(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.check_collection_cap(uuid, numeric, text) to service_role;
grant execute on function public.request_withdrawal(text, numeric) to authenticated;
