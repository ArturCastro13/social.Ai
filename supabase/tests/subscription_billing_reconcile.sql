-- Disposable local database only. Apply 0001-0004 first.
begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reconcile@example.test','',now(),now());
set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select set_config('test.reconcile_workspace',public.ensure_workspace()::text,true);
do $$ begin
  if has_function_privilege('authenticated','public.billing_reconcile_step(text,uuid,text,uuid,bigint,text,text,text,text,text,boolean,text,text,text,timestamptz,timestamptz,text,text)','EXECUTE')
    or has_table_privilege('service_role','public.billing_paid_periods','INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated','public.workspace_billing_access','UPDATE')
  then raise exception 'reconcile writer privilege leaked'; end if;
end $$;
set local role service_role;
do $$ declare w uuid:=current_setting('test.reconcile_workspace')::uuid; r jsonb;
  t1 uuid:='11111111-1111-4111-8111-111111111111'; t2 uuid:='22222222-2222-4222-8222-222222222222';
  from_date timestamptz:='2026-02-01T00:00:00Z'; through_date timestamptz:='2026-03-01T00:00:00Z';
begin
  perform public.billing_checkout_step('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,'claim_customer',p_token=>t1,p_key=>'reconcile-customer');
  perform public.billing_checkout_step('cccccccc-cccc-4ccc-8ccc-cccccccccccc',w,'save_customer',p_token=>t1,p_customer_id=>'cus_reconcile');
  r:=public.billing_reconcile_step('event_begin',p_event_id=>'evt_one',p_event_type=>'invoice.paid',p_object_id=>'in_one');
  if r->>'state'<>'pending' then raise exception 'event not persisted'; end if;
  r:=public.billing_reconcile_step('event_begin',p_event_id=>'evt_one',p_event_type=>'invoice.paid',p_object_id=>'in_one');
  if (select count(*) from public.billing_events where event_id='evt_one')<>1 then raise exception 'event envelope duplicated'; end if;
  r:=public.billing_reconcile_step('claim',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t1);
  if r->>'claimed'<>'true' or (r->>'generation')::bigint<>1 then raise exception 'lease claim failed'; end if;
  r:=public.billing_reconcile_step('claim',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t2);
  if r->>'claimed'<>'false' then raise exception 'concurrent claim succeeded'; end if;
  r:=public.billing_reconcile_step('apply',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t2,p_generation=>1,
    p_subscription_id=>'sub_one',p_status=>'active');
  if r->>'ok'<>'false' then raise exception 'wrong token wrote'; end if;
  r:=public.billing_reconcile_step('apply',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t1,p_generation=>1,
    p_subscription_id=>'sub_one',p_status=>'active',p_invoice_id=>'in_one',p_price_id=>'price_one',p_line_id=>'il_one',
    p_paid_from=>from_date,p_paid_through=>through_date,p_billing_reason=>'subscription_create');
  if r->>'ok'<>'true' then raise exception 'paid grant failed'; end if;
  r:=public.billing_reconcile_step('apply',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t1,p_generation=>1,
    p_subscription_id=>'sub_one',p_status=>'past_due');
  if r->>'ok'<>'true' or (select paid_through from public.workspace_billing_access where workspace_id=w)<>through_date
  then raise exception 'unpaid renewal changed paid period'; end if;
  perform public.billing_reconcile_step('release',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t1,p_generation=>1);
  r:=public.billing_reconcile_step('claim',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t2);
  if r->>'claimed'<>'true' or (r->>'generation')::bigint<>2 then raise exception 'generation did not advance'; end if;
  r:=public.billing_reconcile_step('apply',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t1,p_generation=>1,p_subscription_id=>'sub_one',p_status=>'active');
  if r->>'ok'<>'false' then raise exception 'expired worker wrote'; end if;
  r:=public.billing_reconcile_step('apply',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t2,p_generation=>2,p_subscription_id=>'sub_one',p_status=>'canceled');
  if r->>'ok'<>'true' or (select status from public.workspace_billing_access where workspace_id=w)<>'canceled' then raise exception 'cancellation failed'; end if;
  r:=public.billing_reconcile_step('apply',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t2,p_generation=>2,
    p_subscription_id=>'sub_one',p_status=>'canceled',p_invoice_id=>'in_one',p_price_id=>'price_one',p_line_id=>'il_one',
    p_paid_from=>from_date,p_paid_through=>through_date,p_billing_reason=>'subscription_create');
  if (select count(*) from public.billing_paid_periods where invoice_id='in_one')<>1 then raise exception 'invoice duplicated'; end if;
  r:=public.billing_reconcile_step('hold',p_workspace_id=>w,p_customer_id=>'cus_reconcile',p_token=>t2,p_generation=>2,p_event_id=>'evt_one',p_reason=>'refund',p_subscription_id=>'sub_one');
  if r->>'ok'<>'true' or not (select risk_hold from public.workspace_billing_access where workspace_id=w) then raise exception 'risk hold failed'; end if;
  perform public.billing_reconcile_step('event_begin',p_event_id=>'evt_unresolved',p_event_type=>'charge.refunded',p_object_id=>'ch_unknown');
  r:=public.billing_reconcile_step('event_finish',p_event_id=>'evt_unresolved',p_status=>'risk_unresolved');
  if r->>'ok'<>'true' or not exists(select 1 from public.billing_risks where event_id='evt_unresolved' and reason='unresolved_risk') then raise exception 'unresolved risk lost'; end if;
end $$;
rollback;
