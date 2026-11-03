create table public.supported_countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  collections_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.supported_countries (code, name, currency_code) values
  ('CM', 'Cameroun', 'XAF'),
  ('CD', 'République démocratique du Congo', 'CDF'),
  ('CG', 'Congo-Brazzaville', 'XAF'),
  ('SN', 'Sénégal', 'XOF'),
  ('BF', 'Burkina Faso', 'XOF'),
  ('BJ', 'Bénin', 'XOF'),
  ('NG', 'Nigeria', 'NGN'),
  ('RW', 'Rwanda', 'RWF'),
  ('CI', 'Côte d’Ivoire', 'XOF'),
  ('TG', 'Togo', 'XOF'),
  ('ML', 'Mali', 'XOF'),
  ('GH', 'Ghana', 'GHS'),
  ('KE', 'Kenya', 'KES');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  country_code text references public.supported_countries (code),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'under_review', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  country_code text not null references public.supported_countries (code),
  payout_method text not null,
  payout_contact_encrypted bytea,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  beneficiary_id uuid,
  transaction_id text not null unique,
  swychr_reference text unique,
  country_code text not null references public.supported_countries (code),
  payment_method text not null,
  amount numeric(20, 2) not null check (amount > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  processing_fee numeric(20, 2) not null default 0 check (processing_fee >= 0),
  net_payable numeric(20, 2) not null check (net_payable >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'successful', 'failed', 'expired', 'declined', 'rejected', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (beneficiary_id, owner_id)
    references public.beneficiaries (id, owner_id) on delete restrict
);

create table public.manual_payouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  beneficiary_id uuid not null,
  transaction_id uuid,
  amount numeric(20, 2) not null check (amount > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled')),
  payout_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (beneficiary_id, owner_id)
    references public.beneficiaries (id, owner_id) on delete restrict,
  foreign key (transaction_id, owner_id)
    references public.transactions (id, owner_id) on delete restrict
);

create index beneficiaries_owner_id_idx on public.beneficiaries (owner_id);
create index transactions_owner_created_idx on public.transactions (owner_id, created_at desc);
create index transactions_beneficiary_id_idx on public.transactions (beneficiary_id);
create index manual_payouts_owner_status_idx on public.manual_payouts (owner_id, status, created_at desc);
create index manual_payouts_beneficiary_id_idx on public.manual_payouts (beneficiary_id);

alter table public.supported_countries enable row level security;
alter table public.profiles enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.transactions enable row level security;
alter table public.manual_payouts enable row level security;

revoke all on table public.supported_countries from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.beneficiaries from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.manual_payouts from anon, authenticated;

grant select on table public.supported_countries to anon, authenticated;
grant select, insert on table public.profiles to authenticated;
grant select, insert on table public.beneficiaries to authenticated;
grant select on table public.transactions to authenticated;
grant select on table public.manual_payouts to authenticated;

create policy "Country catalog is readable"
  on public.supported_countries for select
  to anon, authenticated
  using (true);

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create a pending own profile"
  on public.profiles for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and verification_status = 'pending'
  );

create policy "Users can read their own beneficiaries"
  on public.beneficiaries for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can add beneficiaries to their own account"
  on public.beneficiaries for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can read their own transactions"
  on public.transactions for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can read their own manual payouts"
  on public.manual_payouts for select
  to authenticated
  using ((select auth.uid()) = owner_id);
