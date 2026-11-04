-- Adresse et secret de notification de chaque développeur (ses notifications de paiement).
-- Table réservée au serveur (clé service role) : ni le navigateur ni les utilisateurs ne la lisent directement.

create table if not exists public.merchant_webhooks (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  url text not null check (url ~ '^https://'),
  secret text not null check (char_length(secret) >= 32),
  updated_at timestamptz not null default now()
);

alter table public.merchant_webhooks enable row level security;
revoke all on table public.merchant_webhooks from anon, authenticated;
