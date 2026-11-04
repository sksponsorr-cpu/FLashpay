-- Le webhook accepte le montant demandé OU le montant payé par le client (montant + 2,5 %),
-- car les frais Swychr sont à la charge du payeur. Le reste de la logique est inchangé.

create or replace function public.apply_swychr_payment_event(
  p_transaction_id text,
  p_provider_status text,
  p_amount numeric,
  p_currency_code text,
  p_swychr_reference text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx record;
  v_gross numeric;
begin
  select t.id, t.amount, t.currency_code, t.status
    into v_tx
  from public.transactions as t
  where t.transaction_id = p_transaction_id
  for update;

  if not found then
    return 'UNKNOWN_TRANSACTION';
  end if;

  update public.transactions
  set provider_status = p_provider_status,
      swychr_reference = coalesce(swychr_reference, p_swychr_reference),
      updated_at = now()
  where id = v_tx.id;

  if p_provider_status <> 'successful' then
    return 'RECORDED';
  end if;

  if v_tx.status = 'successful' then
    return 'ALREADY_PROCESSED';
  end if;

  -- Montant demandé, ou montant payé avec les 2,5 % de frais à la charge du payeur (tolérance d'un franc).
  v_gross := round(v_tx.amount * 1.025, 2);
  if v_tx.currency_code <> p_currency_code
     or (abs(p_amount - v_tx.amount) > 1 and abs(p_amount - v_gross) > 1) then
    return 'AMOUNT_MISMATCH';
  end if;

  update public.transactions
  set status = 'successful',
      updated_at = now()
  where id = v_tx.id;

  return 'SUCCESSFUL';
end;
$$;

revoke all on function public.apply_swychr_payment_event(text, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.apply_swychr_payment_event(text, text, numeric, text, text) to service_role;
