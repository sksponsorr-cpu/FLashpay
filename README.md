# FlashPay

FlashPay is a French-language payment dashboard prototype for individuals receiving mobile-money payments. It includes a responsive merchant dashboard, a Direct API collection form, Swychr server routes, and signed-webhook validation.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The app starts in **demo mode**. Collection requests are simulated; no money is moved. The sample balances and transactions shown in the dashboard are illustrative. The country selector includes Cameroon, DR Congo, Congo-Brazzaville, Senegal, Burkina Faso, Benin, Nigeria, Rwanda, Cote d'Ivoire, Togo, Mali, Ghana, and Kenya. Live operators are queried from Swychr; availability is not assumed from the country list.

## Supabase setup

Create a Supabase project, then copy its Project URL and publishable key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never add a Supabase service-role key to browser code or commit it.

Apply [`supabase/migrations/20261102100000_initial_flashpay_schema.sql`](supabase/migrations/20261102100000_initial_flashpay_schema.sql) in the Supabase SQL Editor. The migration creates the initial country catalog, user profiles, beneficiaries, transactions, and manual payout tables. Row Level Security is enabled, users can read their own rows, and browser clients cannot write payment statuses or mark payouts paid.

The dashboard reads its country list from Supabase, with a local fallback. Email/password signup and login use Supabase Auth; the proxy checks signed-in claims before showing the dashboard. Add `http://localhost:3000/auth/confirm` to the Supabase Auth redirect URL allow-list for local email confirmations.

All countries start with `collections_enabled = false`; enable a country only after confirming Swychr support and your account approval. The schema is prepared, but transaction, beneficiary, and payout screens still use sample data until their database operations are connected.

To enable test API keys, also apply [`supabase/migrations/20261103100000_test_api_keys.sql`](supabase/migrations/20261103100000_test_api_keys.sql). Keys begin with `fp_test_`, are shown once, and are stored as hashes. The `POST /api/v1/collections` endpoint only returns a simulation; it never contacts Swychr. Production keys are not available in this version.

## Swychr configuration

The API key and webhook secret must only exist in the server-side `.env.local` file or a deployment secret manager. Never place them in client-side code or commit `.env.local`.

`SWYCHR_PROVIDER_LOOKUPS_ENABLED` defaults to `false` and controls live payment-method lookup only. For live country methods, configure `SWYCHR_API_KEY` on the server and set this flag to `true`. If the DRC still returns no methods, ask Swychr to enable `CD` collections on the merchant account; the country list alone does not activate a payment rail. Real collections are deliberately blocked in this prototype, even if `SWYCHR_LIVE_PAYMENTS_ENABLED` is set: durable transaction storage, webhook processing, and written Swychr approval are not yet in place. Do not enable real collection from this prototype.

Swychr's supplied Collection API documentation states a 2.5% default processing fee, subject to the commercial rate configured for the merchant account and country. The landing-page calculator uses 2.5% as an estimate and a 1% FlashPay commission example only. Neither rate is applied to real payments. Confirm the fee and markup rules in writing with Swychr before publishing prices.

The integration uses:

- `POST https://api.accountpe.com/api/payin/create_payment_request` for Direct API collections.
- `POST https://api.accountpe.com/api/payout/payout_methods` to retrieve methods for a country.
- `POST /api/webhooks/swychr` to verify `X-Webhook-Signature-V2` over the timestamp and raw request body.

Set `SWYCHR_WEBHOOK_SECRET` from Swychr Profile Settings only in a secure server environment. The handler validates authenticity and freshness, then returns `503` because durable transaction persistence is not implemented; do not configure it for production deliveries yet.

## Scope and production readiness

This workspace is an MVP prototype, not a production-ready financial service. The dashboard figures are sample data. Supabase Auth is connected, but transaction storage is not yet wired to the screens. Identity-document upload/storage, durable webhook processing, automated payouts, and a country-by-country compliance workflow are also not implemented. Do not collect real identity documents or enable live payments until these controls and the required provider/regulatory approvals are in place.

Swychr's Direct API credits collections to the merchant wallet. FlashPay does not automate transfers to beneficiaries.
