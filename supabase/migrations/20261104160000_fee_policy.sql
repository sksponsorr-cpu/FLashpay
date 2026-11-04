-- Commission d'encaissement passée à 6 % pour toutes les devises.
-- Les frais Swychr (2,5 %) sont désormais à la charge du payeur (pass_digital_charge = true).

update public.fee_settings
set platform_rate = 6.00,
    updated_at = now();
