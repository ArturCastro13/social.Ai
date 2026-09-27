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

## Review fix round 1

- Existing attempts now return `draft_current` from the owner-checked SQL claim after locking the persisted draft row and verifying its current version plus usable snapshot. A stale/revoked attempt is resolved and its open session expired before another URL can be returned. Replaying the obsolete client version then gets `invalid_draft`; an invented new version does not expire a still-current session.
- `expireCheckout` accepts only confirmed `complete` or `expired` states after an expiration call or race recovery. The service also rejects an `open` response. The attempt stays open for later recovery; no replacement Checkout is created on an unconfirmed expiration.
- Remote current-subscription listing scans the whole Customer without a Price filter. An active subscription on a different Price fails evidence normalization; the service persists an operator hold instead of creating another checkout.
- RED: `npx vitest run tests/billing-checkout.test.ts tests/billing-stripe-adapter.test.ts` failed 4 tests for stale draft URL, still-open expiration, and foreign-Price filtering. GREEN: the same focused command passed 20 tests. `npx tsc --noEmit -p .` passed. Root's isolated PGlite rerun passed migrations 0001–0003 and all three SQL suites after the draft-current SQL assertion was added.
- Remaining narrow risk: the checkout frequency RPC and the attempt's `frequency_state` update are separate transactions. A process crash or local write failure between them can consume a second hourly frequency slot on retry. It cannot create a second Stripe Checkout because the attempt and Stripe idempotency key are already durable; making the frequency reservation itself idempotent is deferred.

## Review fix round 2

- The SQL claim now returns both `draft_current` for the open attempt and `requested_current` for the caller's requested draft. It checks the requested draft under the workspace lock against current version and usable snapshot, including ownership. A valid switch from draft A to draft B expires A and reserves B. An invented, foreign, stale, or revoked B is rejected while a still-current A remains open. When A itself became stale, it is resolved/expired before rejecting an obsolete request.
- RED: `npx vitest run tests/billing-checkout.test.ts` failed the two new valid-B/invalid-B cases. GREEN: `npx vitest run tests/billing-checkout.test.ts tests/billing-stripe-adapter.test.ts` passed 22 tests; `npx tsc --noEmit -p .` passed. Root's isolated PGlite rerun passed all three migrations and SQL suites after new SQL assertions for valid and nonexistent second drafts.
