# Task 6 report — verified Stripe events and reconciled access

## Delivered

- Webhook verifies the raw signed event with Stripe SDK 22.6.2, rejects live mode, limits the body to 64 KiB, stores a minimal event envelope, and returns sanitized `{erro,codigo}` failures. Unknown verified events are ignored; failed processing stays pending for Stripe retry.
- Reconciliation uses the persisted Customer-to-workspace mapping, one workspace lease with a monotonic generation, current Stripe subscription state, and verified paid invoice lines. Paid grants are unique by invoice and limited to `subscription_create` / `subscription_cycle`. An unpaid latest invoice keeps the previous paid interval without extending it; canceled current state gates an old paid event.
- Duplicate or inconsistent current subscriptions create an operator hold. Refunds and disputes resolve through current Charge, Invoice Payments, Invoice, and Subscription evidence; partial refunds are included. Unresolved risk events are retained for operator work. No refund or cancellation mutation is performed.
- Checkout status checks the authorized attempt, fetches current Stripe data, and reconciles through the same lease. A completed Checkout URL alone never grants paid access.
- `npx tsx scripts/reconciliar-billing.ts --test --pending` loads local environment configuration, refuses live mode through `stripeTestConfig`, replays durable verified pending envelopes, and logs only counts.

## Verification

- RED focused tests initially failed because reconciliation and status modules were absent.
- GREEN focused tests: 3 files, 14 tests passed after the last test additions.
- Full `npx vitest run`: 36 files, 401 tests passed. `npx tsc --noEmit -p .`, `npx eslint .`, and `git diff --check` passed.
- Root's isolated PGlite harness passed migrations 0001–0004 and all four SQL assertion suites, including `subscription_billing_reconcile.sql`. This uses a minimal Supabase Auth/role shim; live Supabase and true two-connection PostgreSQL concurrency are not claimed.

## Operational limits

- Stripe account calls, restricted-key permission checks, signed remote webhook delivery, payment simulation, and remote SQL deployment remain pending in an authorized sandbox. No secrets, remote API, Vercel, push, or production changes were used here.
- Legacy Charges without a PaymentIntent require scanning known Customer invoices and their payment allocations; unresolved results stay in the durable risk queue for an operator.
- The CLI replays only `pending` envelopes. `risk_unresolved` is an operator state and is intentionally excluded from automatic replay.
