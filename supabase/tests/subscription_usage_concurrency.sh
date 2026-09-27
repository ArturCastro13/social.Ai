#!/usr/bin/env bash
# Run only against a local disposable Supabase/Postgres database with both
# subscription migrations already applied. Requires a role able to seed auth.
set -euo pipefail

if [[ ${USAGE_TEST_DISPOSABLE:-} != YES || ! ${PGHOST:-} =~ ^(localhost|127\.0\.0\.1)$ || ! ${PGDATABASE:-} =~ (_test|_disposable)$ ]]; then
  echo 'Set USAGE_TEST_DISPOSABLE=YES, local PGHOST, and a *_test/*_disposable PGDATABASE.' >&2
  exit 2
fi
command -v psql >/dev/null
command -v rg >/dev/null

actor=$(psql -XqAt -v ON_ERROR_STOP=1 -c 'select gen_random_uuid()')
workspace=$(psql -XqAt -v ON_ERROR_STOP=1 -c 'select gen_random_uuid()')
draft=$(psql -XqAt -v ON_ERROR_STOP=1 -c 'select gen_random_uuid()')
op_a=$(psql -XqAt -v ON_ERROR_STOP=1 -c 'select gen_random_uuid()')
op_b=$(psql -XqAt -v ON_ERROR_STOP=1 -c 'select gen_random_uuid()')
for id in "$actor" "$workspace" "$draft" "$op_a" "$op_b"; do
  [[ $id =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]] || exit 2
done
output_a=$(mktemp)
cleanup() {
  psql -XqAt -v ON_ERROR_STOP=1 -c "delete from auth.users where id = '$actor'::uuid" >/dev/null || true
  rm -f -- "$output_a"
}
trap cleanup EXIT

psql -XqAt -v ON_ERROR_STOP=1 <<SQL
begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
values ('$actor','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
  'usage-concurrency-$actor@example.test','',now(),now());
insert into public.workspaces(id,owner_user_id) values ('$workspace','$actor');
insert into public.drafts(id,workspace_id,version,body)
values ('$draft','$workspace',1,'{"brand":null,"preferencias":{},"contexto":null,"personalizacoes":{}}'::jsonb);
insert into public.draft_versions(draft_id,workspace_id,version,body)
select id,workspace_id,version,body from public.drafts where id = '$draft';
commit;
SQL

# Session A holds the workspace lock after taking the final free image slot.
psql -XqAt -v ON_ERROR_STOP=1 >"$output_a" <<SQL &
begin;
set local role service_role;
select public.reserve_workspace_usage('$actor','$workspace','$op_a',
  'image_generate','$draft',1,repeat('a',64))->>'state';
select pg_sleep(4);
commit;
SQL
pid_a=$!
sleep 1

# Session B must wait on A and then observe the committed quota use.
result_b=$(psql -XqAt -v ON_ERROR_STOP=1 <<SQL
begin;
set local role service_role;
select public.reserve_workspace_usage('$actor','$workspace','$op_b',
  'image_generate','$draft',1,repeat('b',64))->>'status';
commit;
SQL
)
wait "$pid_a"
[[ $(rg -c '^reserved$' "$output_a") == 1 ]]
[[ $result_b == quota ]]
used=$(psql -XqAt -v ON_ERROR_STOP=1 -c "select count(*) from public.usage_operations where workspace_id = '$workspace'::uuid and kind = 'image_generate' and state <> 'released'")
[[ $used == 1 ]]
echo 'PASS: two connections committed only one image reservation.'
