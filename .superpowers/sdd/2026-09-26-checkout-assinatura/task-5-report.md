# Task 5 report — hosted sandbox checkout and portal

## Delivered

- Checkout and portal POST routes use owner scope, strict Origin, bounded JSON, and private `{erro,codigo}` errors. `BILLING_MODE=disabled` remains the default gate.
- The billing service persists one Customer and one open attempt per workspace through the service-role `billing_checkout_step` RPC. It stores a separate immutable idempotency key, request input, first-request timestamp, and fenced lease before calling Stripe. A failed local Customer/Session write retries the same key and parameters. An unknown outcome aged 24 hours is held for operator recovery; it is never replayed with a fresh key.
- Existing current remote subscriptions and local billing access stop another purchase. Duplicate current subscriptions persist an operator hold. A changed draft or expired open Checkout is expired and rechecked before reserving a replacement. The checkout frequency guard is used only once per new attempt after its durable reservation.
- The Stripe adapter pins API `2026-08-26.dahlia` for SDK 22.6.2. It checks test-mode Customer/Price/Checkout/subscription/invoice evidence, BRL monthly licensed Price, exact server URLs, owner and attempt metadata, paginated session lines/subscription items/invoice lines, and safe explicit portal configuration. Invoice evidence uses `Invoice.status`, `Invoice.parent.subscription_details`, and `InvoiceLineItem.parent/pricing/period`, allowing only `subscription_create` and `subscription_cycle`.
- `CheckoutResult` is a discriminated union: `checkout`, `billing_state`, or `operator_required`. No completed session alone grants paid access.

## Verification

- RED: `npx vitest run tests/billing-checkout.test.ts` failed on missing `createBillingHarness` (1 test).
- GREEN focused: `npx vitest run tests/billing-checkout.test.ts tests/billing-stripe-adapter.test.ts` passed, 15 tests.
- Full `npm test`: 34 files, 388 tests passed.
- `npx tsc --noEmit -p .` passed; `git diff --check` passed.
- `npm run lint` passed with two unused-parameter warnings in the new SDK fixture; those were removed, then focused lint and type check were rerun.
- Migration 0003 and `supabase/tests/subscription_billing.sql` passed in root's isolated PGlite harness with migrations 0001/0002 and their SQL tests. This uses a minimal Supabase Auth/role shim; no live Supabase deployment or two-connection PostgreSQL concurrency run occurred.

## Task 6 interface and limits

- Gateway exposes normalized `getSubscription`, `getInvoiceReference`, and strict `getPaidInvoice`. `invoice_not_paid` is a typed `StripeEvidenceError`, distinct from transport failures. It also exposes paginated current-subscription listing. Task 6 can use these without importing Stripe SDK types into app components.
- Task 6 still needs webhook signature verification, `checkoutStatus` synchronization, durable event envelopes, fenced `subscriptions`/`billing_events` and `workspace_billing_access` reconciliation, paid-invoice recovery when the latest invoice is unpaid, and the charge/dispute-to-invoice-payment risk resolver. These are not claimed by this task.
- No Stripe credentials, remote API, remote database, Vercel, or payment simulation were used. Adapter tests use SDK-shaped synthetic objects; restricted-key permissions and actual Stripe behavior remain an external sandbox verification step.
