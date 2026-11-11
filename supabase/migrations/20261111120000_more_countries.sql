-- Pays ajoutés à la configuration : Tanzanie, Ouganda, Sierra Leone, Zambie.
insert into public.supported_countries (code, name, currency_code) values
  ('TZ', 'Tanzanie', 'TZS'),
  ('UG', 'Ouganda', 'UGX'),
  ('SL', 'Sierra Leone', 'SLE'),
  ('ZM', 'Zambie', 'ZMW')
on conflict (code) do nothing;
