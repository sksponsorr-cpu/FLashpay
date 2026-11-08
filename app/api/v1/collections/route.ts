-- Bascule entre fournisseurs de paiement (Swychr / SasPay), pilotée depuis l'espace admin.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Table accessible uniquement par la clé service role (aucune politique RLS publique).
alter table public.app_settings enable row level security;

insert into public.app_settings (key, value)
values ('payment_provider', 'swychr')
on conflict (key) do nothing;

-- Colonnes nécessaires pour retrouver une transaction chez le fournisseur.
alter table public.transactions
  add column if not exists provider text not null default 'swychr',
  add column if not exists provider_transaction_id text;

create index if not exists transactions_provider_tx_idx
  on public.transactions (provider, provider_transaction_id);
