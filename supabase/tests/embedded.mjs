// Disposable PostgreSQL-in-WASM checks only. Never connects to a remote database.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

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
  }
} catch (error) {
  console.error("SQL assertion failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
} finally {
  await db.close();
}
