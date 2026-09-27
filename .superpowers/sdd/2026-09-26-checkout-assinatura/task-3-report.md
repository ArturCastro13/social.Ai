# Task 3 report — persistent workspace usage

## Delivered

- `usage_operations` is an owner-scoped ledger. Its service-role RPC locks the workspace row, checks the immutable draft snapshot, reuses an existing operation before recounting quota, then serializes the UTC global daily cap through `usage_global_days`. SQL owns the production limits; `TEST_LIMITS` mirrors them for fixtures. Free limits are lifetime per workspace. Paid limits bind to the exact persisted `paid_from` / `paid_through` interval. A paid status without a valid paid interval cannot silently use the free tier.
- `workspace_billing_access` is inserted as `none` for existing/new workspaces. Authenticated sessions can only select their row; neither authenticated nor service-role users have arbitrary table mutation privileges. Task 6 must supply its own owner checked, fenced reconciliation writer. The ledger reads this table inside its reservation transaction.
- `reserved -> started` is a compare-and-set before calling a provider. A second caller cannot also start. Only `reserved -> released` refunds quota. `started` / `uncertain` retries return their state and must be recovered explicitly; `completed` returns the same result ID without new quota. The client supplies a UUID operation key and an optional immutable `requestHash`; the service hashes it together with kind, draft ID and version. Images must include a fingerprint of the actual post, variation, and other provider inputs.
- Server-side rate controls: 30 new workspace provider reservations per hour; 60 new provider operations globally per UTC day; HMAC-only persistent frequency buckets for OTP send/verify, checkout, and provider entry points. `FREQUENCY_HMAC_KEY` (at least 32 UTF-8 bytes) is required when a frequency bucket is used; missing DB/config gives 503. The 60-unit cap is conservative operation control, not a precise dollar budget.
- Private HTTP errors now use `{erro,codigo}`. Origin validation reuses `protegerOrigem` and still requires the configured `APP_ORIGIN`; JSON body reading reuses streamed `lerCorpoLimitado`. OTP accepts optional `captchaToken` and passes it to Supabase Auth while retaining service-side CAPTCHA behavior.
- Exported `brandProfileSchema` and `personalizacaoSchema`. `DraftBody.contexto` is canonical: a matching `preferencias.contexto_empresa` is stripped before persistence; a divergent copy is rejected. The old SQL `draft_material_ids` continues inspecting both locations for historical snapshots and source revocation.

## Contracts for Tasks 5 and 6

- Task 5 calls `reserveCheckoutFrequency(scope)` after `requireScope()` and before creating a new remote checkout attempt. It requires `FREQUENCY_HMAC_KEY`, Supabase URL/service key, and the verified user ID. Retry/reconciliation paths should avoid spending a new frequency slot where no new checkout is attempted.
- Task 6 writes `workspace_billing_access` only through a newly fenced, owner checked, service-role RPC. Use workspace row lock before access row lock to match `reserve_workspace_usage` lock order. It must persist Stripe-backed paid period endpoints; this module never grants access based on browser input.
- A provider route calls `reserveUsage(scope,{operationId,kind,draftId,draftVersion,requestHash?})`. It must invoke the provider only after `markUsageStarted(scope,operationId)` succeeds. On known no-call failure it may `releaseUnusedUsage`; after an ambiguous call it invokes `markUsageUncertain` and never silently retries. On success it calls `finishUsage(scope,operationId,resultId)`. A completed response is reused. Task 4 can additionally retain the existing `reservarUso*` local frequency guards; paid routes must exclude old email demo allocation and never fall back to local paid generation.

## Verification and limits

- RED: `npx vitest run tests/workspace-usage.test.ts` failed because `@/lib/workspace/usage` did not exist.
- GREEN focused: `npx vitest run tests/workspace-usage.test.ts tests/assinatura-auth.test.ts tests/workspace-drafts.test.ts` passed (24 tests at first green; final counts below).
- `supabase/tests/subscription_usage.sql` includes privilege, quota, retry, mismatch, started timeout, completed reuse, release, HMAC frequency, and paid interval assertions plus a two-connection lock recipe. It was **not executed** because no disposable Supabase/Postgres database is available. The JavaScript harness serializes a fake repository and cannot prove PostgreSQL lock or RLS behavior. Remote migrations were not applied.
- The new billing path is still disabled by default (`BILLING_MODE=disabled`). No legacy provider route or UI code was changed.

## Final commands

- `npm test`: 32 files, 370 tests passed.
- `npm run lint`: passed without warnings.
- `npx tsc --noEmit -p .`: passed.
- `git diff --check`: passed.

## Review fix round 1 — start boundary and historical lookup

- `reserve_workspace_usage` checks an existing `(workspace, operation)` and immutable hash before testing the current draft. Completed, started, and uncertain records therefore remain readable to the owner after source revocation or draft deletion. A new reservation still requires a live, usable versioned snapshot.
- New reservations and `reserved -> started` lock the draft row before checking `draft_snapshot_usable`, serializing against `save_draft` source removal and draft deletion. At start, the RPC also locks persisted billing access and checks risk hold, allowed status, current paid window, and exact equality to the reservation's stored paid period. Free reservations can start only while free access remains allowed. Expired, shifted, or risk-held paid periods cannot start a previously reserved provider operation.
- `subscription_usage.sql` now asserts source revocation between reserve/start, risk hold, expiry, period change, and historical lookup after draft deletion. The fake repository tests the service's 409 behavior and historical result contract; only a real SQL run can verify its lock semantics.
- `subscription_usage_concurrency.sh` is an executable two-connection test for a local disposable `*_test` or `*_disposable` database with migrations already applied. It seeds a workspace, holds session A after its reservation, and asserts session B waits then receives quota. It has not been run; no local disposable database is available, and no remote database was touched.
- Fix-round checks: `npx vitest run tests/workspace-usage.test.ts` (8 passed), `npm run lint`, `npx tsc --noEmit -p .`, `bash -n supabase/tests/subscription_usage_concurrency.sh`, and `git diff --check` all passed. PostgreSQL SQL and concurrency assertions remain unexecuted.
