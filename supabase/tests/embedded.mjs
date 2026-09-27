// Disposable PostgreSQL-in-WASM checks only. Never connects to a remote database.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { require as tsxRequire } from "tsx/cjs/api";

const { PGlite } = createRequire(import.meta.url)("@electric-sql/pglite");
const db = new PGlite();
const root = new URL("../../", import.meta.url);
const files = [
  "supabase/migrations/202609260001_subscription_workspace.sql",
  "supabase/migrations/202609260002_usage_operations.sql",
  "supabase/migrations/202609260003_billing.sql",
  "supabase/migrations/202609260004_billing_reconcile.sql",
  "supabase/tests/subscription_workspace.sql",
  "supabase/tests/subscription_usage.sql",
  "supabase/tests/subscription_billing.sql",
  "supabase/tests/subscription_billing_reconcile.sql",
];

try {
  // Minimal Supabase role/Auth shim, NOT the real Auth service or schema.
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY, instance_id uuid, aud text, role text, email text,
      encrypted_password text, created_at timestamptz, updated_at timestamptz
    );
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  `);
  for (const file of files) {
    await db.exec(await readFile(new URL(file, root), "utf8"));
    console.log(`PASS ${file}`);
    if (file === "supabase/migrations/202609260004_billing_reconcile.sql") {
      // Exercise the real RPC JSON through the exact parser used in production.
      const { parseCustomerClaim } = tsxRequire("../../src/lib/billing/repository.ts", import.meta.url);
      await db.exec(`BEGIN;
        INSERT INTO auth.users(id) VALUES ('12345678-1234-4234-8234-123456789abc');
        SELECT set_config('request.jwt.claim.sub','12345678-1234-4234-8234-123456789abc',true);`);
      const workspace = await db.query("SELECT public.ensure_workspace() AS id");
      const scope = { userId: "12345678-1234-4234-8234-123456789abc", workspaceId: workspace.rows[0].id };
      const token = "12345678-1234-4234-8234-123456789def";
      const step = async action => (await db.query(`SELECT public.billing_checkout_step($1::uuid,$2::uuid,$3,
        p_token=>$4::uuid,p_key=>'customer-contract',p_customer_id=>'cus_contract') AS result`,
        [scope.userId, scope.workspaceId, action, token])).rows[0].result;
      assert.equal(parseCustomerClaim(await step("claim_customer"), scope).claimed, true);
      await step("save_customer");
      await step("release_customer");
      const raw = await step("claim_customer");
      const reused = parseCustomerClaim(raw, scope);
      assert.equal(reused.claimed, false);
      assert.equal(reused.created, false);
      assert.equal(reused.row.customerId, "cus_contract");
      assert.throws(() => parseCustomerClaim({ ...raw, claimed: null }, scope));
      await db.exec("ROLLBACK");
      console.log("PASS SQL RPC → repository Customer reuse contract");
    }
  }
} catch (error) {
  console.error("SQL assertion failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
} finally {
  await db.close();
}
