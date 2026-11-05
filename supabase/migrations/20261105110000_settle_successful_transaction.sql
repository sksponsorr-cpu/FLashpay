-- Correctif : le webhook Swychr appelait public.settle_successful_transaction, absente des migrations.
-- Résultat : les portefeuilles marchands n'étaient jamais crédités et les marchands jamais notifiés.
-- Cette fonction est idempotente : credit_wallet_for_transaction vérifie la référence unique du mouvement.

create or replace function public.settle_successful_transaction(p_transaction_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx record;
begin
  select t.id, t.status, t.purpose
    into v_tx
  from public.transactions as t
  where t.transaction_id = p_transaction_id;

  if not found then
    return 'UNKNOWN_TRANSACTION';
  end if;

  if v_tx.status <> 'successful' then
    return 'NOT_SUCCESSFUL';
  end if;

  if v_tx.purpose = 'subscription' then
    -- L'activation de l'abonnement est gérée par son propre flux (voir migrations abonnements).
    return 'subscription';
  end if;

  -- Crédit du portefeuille marchand (net de commission). Sans effet si déjà crédité.
  perform public.credit_wallet_for_transaction(p_transaction_id);
  return 'collection';
end;
$$;

revoke all on function public.settle_successful_transaction(text) from public, anon, authenticated;
grant execute on function public.settle_successful_transaction(text) to service_role;
