-- Disposable local PostgreSQL/Supabase only. Apply migrations 0001-0003 first.
begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','billing@example.test','',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
select set_config('test.billing_workspace',public.ensure_workspace()::text,true);
do $$ begin
  if has_function_privilege('authenticated','public.billing_checkout_step(uuid,uuid,text,uuid,uuid,text,uuid,integer,text,text,jsonb,text)','EXECUTE')
    or has_table_privilege('authenticated','public.billing_customers','INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated','public.checkout_attempts','INSERT,UPDATE,DELETE')
    or has_table_privilege('service_role','public.checkout_attempts','INSERT,UPDATE,DELETE')
  then raise exception 'billing mutation privilege leaked'; end if;
end $$;
set local role service_role;
select set_config('test.billing_draft',
  (public.save_draft('dddddddd-dddd-4ddd-8ddd-dddddddddddd',current_setting('test.billing_workspace')::uuid,
    null,0,'{"brand":null,"preferencias":{},"contexto":null,"personalizacoes":{}}'::jsonb)->'draft'->>'id'),true);
do $$ declare r jsonb; w uuid := current_setting('test.billing_workspace')::uuid;
  actor uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  token uuid := '11111111-1111-4111-8111-111111111111';
  rival uuid := '22222222-2222-4222-8222-222222222222';
  attempt uuid := '33333333-3333-4333-8333-333333333333';
  draft uuid := current_setting('test.billing_draft')::uuid;
  other_draft uuid;
  input jsonb;
begin
  begin
    perform public.billing_checkout_step('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',w,'claim_customer',p_token=>token,p_key=>'customer-key');
    raise exception 'foreign actor claimed workspace';
  exception when invalid_authorization_specification then null; end;
  r := public.billing_checkout_step(actor,w,'claim_customer',p_token=>token,p_key=>'customer-key');
  if r->>'claimed' <> 'true' or r->>'created' <> 'true' or r->'row'->>'idempotency_key' <> 'customer-key'
  then raise exception 'customer first claim failed: %',r; end if;
  r := public.billing_checkout_step(actor,w,'claim_customer',p_token=>rival,p_key=>'different-key');
  if r->>'claimed' <> 'false' or r->'row'->>'idempotency_key' <> 'customer-key'
  then raise exception 'customer lease/key changed'; end if;
  r := public.billing_checkout_step(actor,w,'save_customer',p_token=>rival,p_customer_id=>'cus_wrong');
  if r->>'ok' <> 'false' then raise exception 'stale customer token wrote'; end if;
  r := public.billing_checkout_step(actor,w,'save_customer',p_token=>token,p_customer_id=>'cus_owner');
  if r->>'ok' <> 'true' then raise exception 'customer save failed'; end if;
  input := pg_catalog.jsonb_build_object('customerId','cus_owner','priceId','price_monthly',
    'workspaceId',w::text,'attemptId',attempt::text,
    'successUrl','https://example.test/app/billing/retorno?attempt='||attempt::text,
    'cancelUrl','https://example.test/app/billing/retorno?attempt='||attempt::text||'&cancel=1');
  r := public.billing_checkout_step(actor,w,'claim_attempt',p_id=>attempt,p_token=>token,p_key=>'checkout-key',
    p_draft_id=>draft,p_draft_version=>1,p_customer_id=>'cus_owner',p_input=>input);
  if r->>'claimed' <> 'true' or r->>'created' <> 'true' or r->'row'->>'idempotency_key' <> 'checkout-key'
  then raise exception 'attempt reservation failed: %',r; end if;
  r := public.billing_checkout_step(actor,w,'claim_attempt',p_id=>rival,p_token=>rival,p_key=>'wrong-key',
    p_draft_id=>draft,p_draft_version=>1,p_customer_id=>'cus_owner',p_input=>input);
  if r->>'claimed' <> 'false' or r->'row'->>'idempotency_key' <> 'checkout-key'
  then raise exception 'parallel attempt replaced key'; end if;
  r := public.billing_checkout_step(actor,w,'save_session',p_id=>attempt,p_token=>rival,p_session_id=>'cs_test_wrong');
  if r->>'ok' <> 'false' then raise exception 'stale attempt token wrote'; end if;
  r := public.billing_checkout_step(actor,w,'mark_frequency',p_id=>attempt,p_token=>token,p_reason=>'ok');
  if r->>'ok' <> 'true' then raise exception 'frequency state not persisted'; end if;
  r := public.billing_checkout_step(actor,w,'save_session',p_id=>attempt,p_token=>token,p_session_id=>'cs_test_owner');
  if r->>'ok' <> 'true' then raise exception 'session save failed'; end if;
  perform public.billing_checkout_step(actor,w,'release_attempt',p_id=>attempt,p_token=>token);
  r := public.billing_checkout_step(actor,w,'claim_attempt',p_id=>rival,p_token=>rival,p_key=>'wrong-key',
    p_draft_id=>draft,p_draft_version=>1,p_customer_id=>'cus_owner',p_input=>input);
  if r->>'claimed' <> 'true' or r->'row'->>'session_id' <> 'cs_test_owner' or r->'row'->>'idempotency_key' <> 'checkout-key'
  then raise exception 'same attempt recovery failed'; end if;
  r := public.save_draft(actor,w,null,0,
    '{"brand":null,"preferencias":{},"contexto":null,"personalizacoes":{}}'::jsonb);
  other_draft := (r->'draft'->>'id')::uuid;
  r := public.billing_checkout_step(actor,w,'claim_attempt',p_id=>rival,p_token=>rival,p_key=>'wrong-key',
    p_draft_id=>other_draft,p_draft_version=>1,p_customer_id=>'cus_owner',p_input=>input);
  if r->>'draft_current' <> 'true' or r->>'requested_current' <> 'true' or r->'row'->>'session_id' <> 'cs_test_owner'
  then raise exception 'valid second draft not recognized'; end if;
  r := public.billing_checkout_step(actor,w,'claim_attempt',p_id=>rival,p_token=>rival,p_key=>'wrong-key',
    p_draft_id=>'55555555-5555-4555-8555-555555555555',p_draft_version=>1,p_customer_id=>'cus_owner',p_input=>input);
  if r->>'draft_current' <> 'true' or r->>'requested_current' <> 'false' or r->'row'->>'session_id' <> 'cs_test_owner'
  then raise exception 'invalid second draft affected first checkout'; end if;
  r := public.save_draft(actor,w,draft,1,
    '{"brand":null,"preferencias":{},"contexto":null,"personalizacoes":{}}'::jsonb);
  if r->>'status' <> 'ok' then raise exception 'draft update fixture failed'; end if;
  r := public.billing_checkout_step(actor,w,'claim_attempt',p_id=>rival,p_token=>rival,p_key=>'wrong-key',
    p_draft_id=>draft,p_draft_version=>1,p_customer_id=>'cus_owner',p_input=>input);
  if r->>'draft_current' <> 'false' then raise exception 'stale persisted draft returned as current'; end if;
  r := public.billing_checkout_step(actor,w,'close_attempt',p_id=>attempt,p_token=>token);
  if r->>'ok' is distinct from 'false' or not exists(select 1 from public.checkout_attempts where id=attempt and state='open')
  then raise exception 'stale token retired current attempt'; end if;
  r := public.billing_checkout_step(actor,w,'close_attempt',p_id=>attempt,p_token=>rival);
  if r->>'ok' <> 'true' then raise exception 'session close failed'; end if;
  r := public.billing_checkout_step(actor,w,'claim_attempt',p_id=>'44444444-4444-4444-8444-444444444444',p_token=>token,p_key=>'new-key',
    p_draft_id=>draft,p_draft_version=>3,p_customer_id=>'cus_owner',p_input=>input);
  if r->>'invalid_draft' <> 'true' then raise exception 'stale draft accepted'; end if;
end $$;
rollback;
