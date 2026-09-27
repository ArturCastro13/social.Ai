-- Disposable Supabase test database only. Apply migrations 0001 and 0002 first.
-- Single-session assertions roll back all fixtures. This does NOT prove locking;
-- use the two-session recipe after the assertions.
begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','usage@example.test','',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select set_config('test.workspace',public.ensure_workspace()::text,true);
do $$ begin
  if has_function_privilege('authenticated','public.reserve_workspace_usage(uuid,uuid,uuid,text,uuid,integer,text)','EXECUTE')
    or has_function_privilege('authenticated','public.transition_workspace_usage(uuid,uuid,uuid,text,text,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.reserve_workspace_frequency(text,text,integer,integer)','EXECUTE')
    or has_table_privilege('authenticated','public.workspace_billing_access','INSERT,UPDATE,DELETE')
    or has_table_privilege('service_role','public.workspace_billing_access','INSERT,UPDATE,DELETE')
    or has_table_privilege('service_role','public.usage_operations','INSERT,UPDATE,DELETE')
  then raise exception 'usage privilege leaked'; end if;
  if not exists (select 1 from public.workspace_billing_access where workspace_id = current_setting('test.workspace')::uuid and status = 'none')
  then raise exception 'missing fail-closed access row'; end if;
end $$;
set local role service_role;
select set_config('test.draft',
  (public.save_draft('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    null,0,'{"brand":null,"preferencias":{},"contexto":null,"personalizacoes":{}}'::jsonb)->'draft'->>'id'),true);
do $$ declare r jsonb; w uuid := current_setting('test.workspace')::uuid;
  d uuid := current_setting('test.draft')::uuid;
  h text := repeat('a',64);
begin
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '11111111-1111-4111-8111-111111111111','image_generate',d,1,h);
  if r->>'state' <> 'reserved' then raise exception 'first reservation failed: %', r; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '11111111-1111-4111-8111-111111111111','image_generate',d,1,h);
  if r->>'state' <> 'reserved' then raise exception 'same-key retry changed state'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '11111111-1111-4111-8111-111111111111','image_generate',d,1,repeat('b',64));
  if r->>'status' <> 'conflict' then raise exception 'changed request accepted'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '22222222-2222-4222-8222-222222222222','image_generate',d,1,h);
  if r->>'status' <> 'quota' then raise exception 'free account quota bypassed'; end if;
  if not public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '11111111-1111-4111-8111-111111111111','reserved','started',null)
  then raise exception 'start failed'; end if;
  if public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '11111111-1111-4111-8111-111111111111','reserved','released',null)
  then raise exception 'started operation refunded'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '11111111-1111-4111-8111-111111111111','image_generate',d,1,h);
  if r->>'state' <> 'started' then raise exception 'unknown outcome silently retried'; end if;
  if not public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '11111111-1111-4111-8111-111111111111','started','completed',
    '33333333-3333-4333-8333-333333333333')
  then raise exception 'finish failed'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '11111111-1111-4111-8111-111111111111','image_generate',d,1,h);
  if r->>'state' <> 'completed' or r->>'result_id' <> '33333333-3333-4333-8333-333333333333'
  then raise exception 'completed result not reused'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '44444444-4444-4444-8444-444444444444','material_extract',d,1,h);
  if r->>'state' <> 'reserved' then raise exception 'extract reserve failed'; end if;
  if not public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,
    '44444444-4444-4444-8444-444444444444','reserved','released',null)
  then raise exception 'unused release failed'; end if;
  if not public.reserve_workspace_frequency('otp_send',h,3600,1)
    or public.reserve_workspace_frequency('otp_send',h,3600,1)
  then raise exception 'persistent OTP frequency failed'; end if;
end $$;
set local role postgres;
update public.workspace_billing_access set status = 'active',
  paid_from = now() - interval '1 day', paid_through = now() + interval '1 day'
  where workspace_id = current_setting('test.workspace')::uuid;
set local role service_role;
do $$ declare r jsonb; begin
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'55555555-5555-4555-8555-555555555555',
    'image_generate',current_setting('test.draft')::uuid,1,repeat('c',64));
  if r->>'state' <> 'reserved' then raise exception 'paid reservation failed'; end if;
  if not exists (select 1 from public.usage_operations where operation_id = '55555555-5555-4555-8555-555555555555'
    and tier = 'paid' and period_start is not null and period_end is not null)
  then raise exception 'paid period missing'; end if;
end $$;
-- Access is checked again at the one-way boundary before an external call.
set local role postgres;
update public.workspace_billing_access set risk_hold = true
  where workspace_id = current_setting('test.workspace')::uuid;
set local role service_role;
do $$ begin
  if public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    '55555555-5555-4555-8555-555555555555','reserved','started',null)
  then raise exception 'risk-held paid reservation started'; end if;
end $$;
set local role postgres;
update public.workspace_billing_access set risk_hold = false, paid_through = now() - interval '1 second'
  where workspace_id = current_setting('test.workspace')::uuid;
set local role service_role;
do $$ begin
  if public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    '55555555-5555-4555-8555-555555555555','reserved','started',null)
  then raise exception 'expired paid reservation started'; end if;
end $$;
set local role postgres;
update public.workspace_billing_access set paid_through = now() + interval '1 day'
  where workspace_id = current_setting('test.workspace')::uuid;
set local role service_role;
do $$ declare r jsonb; begin
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'55555555-5555-4555-8555-555555555555',
    'image_generate',current_setting('test.draft')::uuid,1,repeat('c',64));
  if r->>'state' <> 'reserved' then raise exception 'reservation accounting changed on retry'; end if;
  if not public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    '55555555-5555-4555-8555-555555555555','reserved','started',null)
  then raise exception 'valid paid reservation failed to start'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'77777777-7777-4777-8777-777777777777',
    'image_generate',current_setting('test.draft')::uuid,1,repeat('d',64));
  if r->>'state' <> 'reserved' then raise exception 'second paid reservation failed'; end if;
end $$;
set local role postgres;
update public.workspace_billing_access set paid_from = now() - interval '2 days', paid_through = now() + interval '2 days'
  where workspace_id = current_setting('test.workspace')::uuid;
set local role service_role;
do $$ begin
  if public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    '77777777-7777-4777-8777-777777777777','reserved','started',null)
  then raise exception 'different paid period started old reservation'; end if;
end $$;

-- Removal after reservation revokes an older snapshot before start.
select set_config('test.revoked_draft',
  (public.save_draft('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    null,0,'{"brand":null,"preferencias":{},"contexto":{"materiais":[{"id":"removed-source"}]},"personalizacoes":{}}'::jsonb)->'draft'->>'id'),true);
do $$ declare r jsonb; begin
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'66666666-6666-4666-8666-666666666666',
    'material_extract',current_setting('test.revoked_draft')::uuid,1,repeat('e',64));
  if r->>'state' <> 'reserved' then raise exception 'revocation fixture reserve failed'; end if;
  r := public.save_draft('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    current_setting('test.revoked_draft')::uuid,1,
    '{"brand":null,"preferencias":{},"contexto":null,"personalizacoes":{}}'::jsonb);
  if r->>'status' <> 'ok' then raise exception 'source removal failed'; end if;
  if public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    '66666666-6666-4666-8666-666666666666','reserved','started',null)
  then raise exception 'revoked source started after reserve'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'66666666-6666-4666-8666-666666666666',
    'material_extract',current_setting('test.revoked_draft')::uuid,1,repeat('e',64));
  if r->>'state' <> 'reserved' then raise exception 'historical reserved lookup disappeared'; end if;
end $$;

-- Completed and uncertain operations are history even after draft deletion.
do $$ declare r jsonb; begin
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'88888888-8888-4888-8888-888888888888',
    'context_analyze',current_setting('test.draft')::uuid,1,repeat('f',64));
  if r->>'state' <> 'reserved' then raise exception 'uncertain fixture reserve failed'; end if;
  if not public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    '88888888-8888-4888-8888-888888888888','reserved','started',null)
    or not public.transition_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    '88888888-8888-4888-8888-888888888888','started','uncertain',null)
  then raise exception 'uncertain fixture transition failed'; end if;
  if not public.delete_draft('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_setting('test.workspace')::uuid,
    current_setting('test.draft')::uuid)
  then raise exception 'draft delete failed'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'11111111-1111-4111-8111-111111111111',
    'image_generate',current_setting('test.draft')::uuid,1,repeat('a',64));
  if r->>'state' <> 'completed' or r->>'result_id' <> '33333333-3333-4333-8333-333333333333'
  then raise exception 'completed result lost after draft delete'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'55555555-5555-4555-8555-555555555555',
    'image_generate',current_setting('test.draft')::uuid,1,repeat('c',64));
  if r->>'state' <> 'started' then raise exception 'started history lost after draft delete'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'88888888-8888-4888-8888-888888888888',
    'context_analyze',current_setting('test.draft')::uuid,1,repeat('f',64));
  if r->>'state' <> 'uncertain' then raise exception 'uncertain history lost after draft delete'; end if;
  r := public.reserve_workspace_usage('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    current_setting('test.workspace')::uuid,'99999999-9999-4999-8999-999999999999',
    'context_analyze',current_setting('test.draft')::uuid,1,repeat('f',64));
  if r->>'status' <> 'conflict' then raise exception 'deleted draft accepted new reservation'; end if;
end $$;
rollback;

-- TWO-SESSION CONCURRENCY RECIPE (same disposable DB; do not run on production):
-- 1. Seed a committed user/workspace/draft as above; record UUIDs. Run below
--    from two independent psql connections, substituting those UUIDs and two
--    different operation UUIDs. The workspace must have zero image_generate uses.
-- 2. Session A: BEGIN; SET LOCAL ROLE service_role; SELECT
--    public.reserve_workspace_usage(actor,workspace,op_a,'image_generate',draft,1,repeat('a',64));
--    SELECT pg_sleep(10); COMMIT;
-- 3. While A sleeps, session B: BEGIN; SET LOCAL ROLE service_role; SELECT
--    public.reserve_workspace_usage(actor,workspace,op_b,'image_generate',draft,1,repeat('b',64)); COMMIT;
--    B must wait for A's workspace row lock, then return {"status":"quota"}.
-- 4. Verify SELECT count(*) = 1 FROM public.usage_operations WHERE workspace_id
--    = workspace AND kind = 'image_generate' AND state <> 'released'.
-- 5. Repeat with A ROLLBACK: B should then reserve successfully. Repeat with
--    different workspaces and 59 preseeded daily rows: global row lock permits
--    only one of two new reservations. Clean the committed fixtures afterward.
