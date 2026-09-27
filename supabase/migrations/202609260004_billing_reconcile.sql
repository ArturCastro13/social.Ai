-- Trusted sandbox reconciliation. Apply manually after 0003.
create table public.billing_events (
  environment text not null check (environment = 'test'),
  event_id text not null,
  event_type text not null,
  object_id text not null,
  state text not null default 'pending' check (state in ('pending','processed','ignored','risk_unresolved')),
  workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (environment,event_id)
);
create table public.billing_reconcile_leases (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  generation bigint not null default 0,
  token uuid,
  lease_until timestamptz
);
create table public.billing_subscriptions (
  subscription_id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id text not null,
  status text not null,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create index billing_subscriptions_workspace on public.billing_subscriptions(workspace_id);
create table public.billing_paid_periods (
  invoice_id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subscription_id text not null references public.billing_subscriptions(subscription_id),
  customer_id text not null,
  price_id text not null,
  line_id text not null,
  paid_from timestamptz not null,
  paid_through timestamptz not null,
  billing_reason text not null check (billing_reason in ('subscription_create','subscription_cycle')),
  check (paid_from < paid_through)
);
create table public.billing_risks (
  environment text not null check (environment='test'),
  event_id text not null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  subscription_id text not null default '',
  reason text not null,
  created_at timestamptz not null default now(),
  primary key(environment,event_id,subscription_id)
);
alter table public.billing_events enable row level security;
alter table public.billing_reconcile_leases enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_paid_periods enable row level security;
alter table public.billing_risks enable row level security;
revoke all on public.billing_events, public.billing_reconcile_leases, public.billing_subscriptions, public.billing_paid_periods, public.billing_risks from public, anon, authenticated, service_role;
grant select on public.billing_events, public.billing_reconcile_leases, public.billing_subscriptions, public.billing_paid_periods, public.billing_risks to service_role;

create function public.billing_reconcile_step(
  p_action text, p_workspace_id uuid default null, p_customer_id text default null,
  p_token uuid default null, p_generation bigint default null,
  p_event_id text default null, p_event_type text default null, p_object_id text default null,
  p_subscription_id text default null, p_status text default null, p_cancel boolean default null,
  p_invoice_id text default null, p_price_id text default null, p_line_id text default null,
  p_paid_from timestamptz default null, p_paid_through timestamptz default null,
  p_billing_reason text default null, p_reason text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.billing_reconcile_leases%rowtype; b public.billing_customers%rowtype;
  a public.workspace_billing_access%rowtype; period_row record; event_row public.billing_events%rowtype;
begin
  if p_action = 'event_begin' then
    if p_event_id is null or p_event_type is null or p_object_id is null then raise exception 'invalid event'; end if;
    insert into public.billing_events(environment,event_id,event_type,object_id)
      values('test',p_event_id,p_event_type,p_object_id) on conflict do nothing;
    select * into event_row from public.billing_events where environment='test' and event_id=p_event_id;
    if event_row.event_type <> p_event_type or event_row.object_id <> p_object_id then raise exception 'event mismatch'; end if;
    return pg_catalog.jsonb_build_object('state',event_row.state);
  end if;
  if p_action = 'event_state' then
    select * into event_row from public.billing_events where environment='test' and event_id=p_event_id;
    return pg_catalog.jsonb_build_object('state',event_row.state);
  end if;
  if p_action = 'pending' then
    return pg_catalog.jsonb_build_object('events',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('eventId',event_id,'type',event_type,'objectId',object_id) order by created_at) from
      (select event_id,event_type,object_id,created_at from public.billing_events where state='pending' order by created_at limit 100) x),'[]'::jsonb));
  end if;
  if p_action = 'event_finish' then
    if p_status not in ('processed','ignored','risk_unresolved') then raise exception 'invalid event state'; end if;
    update public.billing_events set state=p_status,workspace_id=p_workspace_id where environment='test' and event_id=p_event_id and state='pending';
    if found and p_status='risk_unresolved' then
      insert into public.billing_risks(environment,event_id,workspace_id,subscription_id,reason)
        values('test',p_event_id,p_workspace_id,'','unresolved_risk') on conflict do nothing;
    end if;
    return pg_catalog.jsonb_build_object('ok',found);
  end if;
  if p_workspace_id is null then raise exception 'missing workspace'; end if;
  perform 1 from public.workspaces where id=p_workspace_id for update;
  if not found then raise exception 'workspace unavailable'; end if;
  select * into b from public.billing_customers where workspace_id=p_workspace_id for update;
  if not found or b.customer_id is null or b.customer_id <> p_customer_id or b.environment <> 'test' then raise exception 'customer mismatch'; end if;
  insert into public.billing_reconcile_leases(workspace_id) values(p_workspace_id) on conflict do nothing;
  select * into l from public.billing_reconcile_leases where workspace_id=p_workspace_id for update;
  if p_action = 'claim' then
    if l.lease_until is not null and l.lease_until >= pg_catalog.clock_timestamp() then
      return pg_catalog.jsonb_build_object('claimed',false,'generation',l.generation);
    end if;
    update public.billing_reconcile_leases set generation=generation+1,token=p_token,lease_until=pg_catalog.clock_timestamp()+interval '60 seconds'
      where workspace_id=p_workspace_id returning * into l;
    return pg_catalog.jsonb_build_object('claimed',true,'generation',l.generation);
  end if;
  if l.token is distinct from p_token or l.generation is distinct from p_generation or l.lease_until <= pg_catalog.clock_timestamp() then
    return pg_catalog.jsonb_build_object('ok',false);
  end if;
  if p_action = 'release' then
    update public.billing_reconcile_leases set token=null,lease_until=null where workspace_id=p_workspace_id;
    return pg_catalog.jsonb_build_object('ok',true);
  elsif p_action = 'apply' then
    if p_subscription_id is null or p_status not in ('incomplete','incomplete_expired','trialing','active','past_due','unpaid','paused','canceled') then raise exception 'invalid subscription'; end if;
    if exists(select 1 from public.billing_subscriptions where subscription_id=p_subscription_id and (workspace_id<>p_workspace_id or customer_id<>p_customer_id)) then raise exception 'subscription mismatch'; end if;
    insert into public.billing_subscriptions(subscription_id,workspace_id,customer_id,status,cancel_at_period_end)
      values(p_subscription_id,p_workspace_id,p_customer_id,p_status,coalesce(p_cancel,false))
      on conflict(subscription_id) do update set status=excluded.status,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=now();
    if p_invoice_id is not null then
      if p_price_id is null or p_line_id is null or p_billing_reason not in ('subscription_create','subscription_cycle') or p_paid_from is null or p_paid_through is null or p_paid_from >= p_paid_through then raise exception 'invalid paid grant'; end if;
      insert into public.billing_paid_periods(invoice_id,workspace_id,subscription_id,customer_id,price_id,line_id,paid_from,paid_through,billing_reason)
        values(p_invoice_id,p_workspace_id,p_subscription_id,p_customer_id,p_price_id,p_line_id,p_paid_from,p_paid_through,p_billing_reason)
        on conflict(invoice_id) do nothing;
      if not exists(select 1 from public.billing_paid_periods where invoice_id=p_invoice_id and workspace_id=p_workspace_id and subscription_id=p_subscription_id and customer_id=p_customer_id and price_id=p_price_id and line_id=p_line_id and paid_from=p_paid_from and paid_through=p_paid_through) then raise exception 'invoice mismatch'; end if;
    end if;
    select paid_from,paid_through into period_row from public.billing_paid_periods where subscription_id=p_subscription_id order by paid_through desc limit 1;
    select * into a from public.workspace_billing_access where workspace_id=p_workspace_id for update;
    if not found then raise exception 'billing access missing'; end if;
    update public.workspace_billing_access set status=p_status,cancel_at_period_end=coalesce(p_cancel,false),
      paid_from=period_row.paid_from,paid_through=period_row.paid_through where workspace_id=p_workspace_id;
    return pg_catalog.jsonb_build_object('ok',true);
  elsif p_action = 'hold' then
    insert into public.billing_operator_holds(workspace_id,reason) values(p_workspace_id,coalesce(p_reason,'risk')) on conflict(workspace_id) do nothing;
    update public.workspace_billing_access set risk_hold=true where workspace_id=p_workspace_id;
    if p_event_id is not null then
      insert into public.billing_risks(environment,event_id,workspace_id,subscription_id,reason)
        values('test',p_event_id,p_workspace_id,coalesce(p_subscription_id,''),coalesce(p_reason,'risk')) on conflict do nothing;
    end if;
    return pg_catalog.jsonb_build_object('ok',true);
  end if;
  raise exception 'unsupported action';
end $$;
revoke all on function public.billing_reconcile_step(text,uuid,text,uuid,bigint,text,text,text,text,text,boolean,text,text,text,timestamptz,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.billing_reconcile_step(text,uuid,text,uuid,bigint,text,text,text,text,text,boolean,text,text,text,timestamptz,timestamptz,text,text) to service_role;
