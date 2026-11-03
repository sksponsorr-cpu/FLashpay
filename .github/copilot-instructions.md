# FlashPay Workspace Instructions

## Setup Progress
- [x] Verify project instructions file exists.
- [x] Clarify project requirements: French-language personal payments SaaS, Next.js, TypeScript, Tailwind, Swychr Direct API, Supabase, and 13 initial target countries.
- [x] Scaffold the project.
- [x] Customize the initial FlashPay dashboard and Swychr server routes.
- [x] Check required extensions; none were specified or needed.
- [x] Compile and validate the application.
- [x] Skip a custom VS Code task; npm scripts are sufficient.
- [x] Launch the local application.
- [x] Finish README and project documentation.

## Product and Safety Rules
- Keep Swychr API keys and webhook secrets on the server only. Never expose them in browser code or commit local environment files.
- Use Supabase migrations for schema changes. Enable RLS and explicitly grant only required operations on every exposed table.
- Keep Supabase service-role keys server-only. Browser code may use only the publishable key with RLS policies enforced.
- Treat configured countries as targets, not proof of provider availability; fetch payment methods from Swychr and keep collections disabled until approved.
- Keep live collections disabled by default. Demo mode must be clearly disclosed and must never imply real money moved.
- Do not claim beneficiary funds are segregated or automatically paid out. Swychr collections credit the merchant wallet; beneficiary amounts are internal obligations until an approved payout flow exists.
- Verify Swychr webhooks with `X-Webhook-Signature-V2` over the timestamp and exact raw request body, reject stale signatures, and handle duplicate deliveries idempotently.
- Treat API status values as provider-defined; support the documented numeric Direct API codes and textual Collection API statuses.
- Never collect real identity documents until authenticated access, private encrypted storage, retention/deletion controls, and a compliant KYC process are implemented.
- Confirm Swychr's written approval for collecting on behalf of third-party beneficiaries before enabling real payments.

## Engineering Conventions
- Use the existing Next.js App Router, TypeScript, Tailwind CSS, and npm setup.
- Read relevant version-matched documentation from `node_modules/next/dist/docs/` before changing Next.js conventions.
- Keep the interface French-first, responsive, accessible, and respectful of `prefers-reduced-motion`.
- Update this checklist and README as setup milestones are completed.
