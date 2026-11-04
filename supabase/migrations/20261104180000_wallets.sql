-- Portefeuilles FlashPay : un solde par devise et par client, avec un journal des mouvements.
-- L'argent réel reste sur le compte Swychr du marchand ; ces soldes sont des comptes internes FlashPay.

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  balance numeric(20, 2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  unique (owner_id, currency_code)
);

create table if not exists public.wallet_movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  wallet_id uuid not null references public.wallets (id) on delete restrict,
  currency_code text not null,
  kind text not null check (kind in ('collection', 'withdrawal', 'conversion_in', 'conversion_out', 'adjustment')),
  -- Montant signé : positif pour un crédit, négatif pour un débit.
  amount numeric(20, 2) not null check (amount <> 0),
  balance_after numeric(20, 2) not null check (balance_after >= 0),
  -- Référence unique : empêche de créditer deux fois le même événement.
  reference text not null unique,
  transaction_id uuid references public.transactions (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists wallet_movements_owner_created_idx on public.wallet_movements (owner_id, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_movements enable row level security;

create policy "wallets_select_own" on public.wallets
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "wallet_movements_select_own" on public.wallet_movements
  for select to authenticated
  using (owner_id = (select auth.uid()));

revoke all on table public.wallets from anon, authenticated;
revoke all on table public.wallet_movements from anon, authenticated;
grant select on table public.wallets to authenticated;
grant select on table public.wallet_movements to authenticated;

-- Crédite le portefeuille de la devise avec le montant net d'une collecte réussie.
-- Idempotent : une collecte ne peut être créditée qu'une seule fois.
-- Réservé au serveur (clé service role).
create or replace function public.credit_wallet_for_transaction(p_transaction_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx record;
  v_wallet_id uuid;
  v_balance numeric;
  v_reference text;
begin
  select t.id, t.owner_id, t.currency_code, t.net_payable, t.status
    into v_tx
  from public.transactions as t
  where t.transaction_id = p_transaction_id;

  if not found then
    return 'UNKNOWN_TRANSACTION';
  end if;

  if v_tx.status <> 'successful' then
    return 'NOT_SUCCESSFUL';
  end if;

  v_reference := 'collection:' || v_tx.id::text;

  if exists (select 1 from public.wallet_movements where reference = v_reference) then
    return 'ALREADY_CREDITED';
  end if;

  insert into public.wallets (owner_id, currency_code, balance)
  values (v_tx.owner_id, v_tx.currency_code, 0)
  on conflict (owner_id, currency_code) do nothing;

  select w.id into v_wallet_id
  from public.wallets as w
  where w.owner_id = v_tx.owner_id and w.currency_code = v_tx.currency_code
  for update;

  update public.wallets
  set balance = balance + v_tx.net_payable,
      updated_at = now()
  where id = v_wallet_id
  returning balance into v_balance;

  insert into public.wallet_movements (
    owner_id, wallet_id, currency_code, kind, amount, balance_after, reference, transaction_id
  ) values (
    v_tx.owner_id, v_wallet_id, v_tx.currency_code, 'collection', v_tx.net_payable, v_balance, v_reference, v_tx.id
  );

  return 'CREDITED';
end;
$$;

revoke all on function public.credit_wallet_for_transaction(text) from public, anon, authenticated;
grant execute on function public.credit_wallet_for_transaction(text) to service_role;
