-- Sandbox checkout state. Run manually after 0001 and 0002; no remote migration is applied here.
create table public.billing_customers (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  environment text not null default 'test' check (environment = 'test'),
  idempotency_key text not null unique,
  customer_id text unique,
  first_requested_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  recovery_required boolean not null default false,
  check (customer_id is null or customer_id like 'cus_%')
);
create table public.checkout_attempts (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  environment text not null default 'test' check (environment = 'test'),
  draft_id uuid not null,
  draft_version integer not null check (draft_version > 0),
  customer_id text not null,
  idempotency_key text not null unique,
  first_requested_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  session_id text unique,
  state text not null default 'pending' check (state in ('pending','open','closed','operator_required')),
  frequency_state text not null default 'pending' check (frequency_state in ('pending','ok','denied')),
  input jsonb not null,
  check (customer_id like 'cus_%'),
  check (session_id is null or session_id like 'cs_test_%')
);
create unique index checkout_one_open on public.checkout_attempts(workspace_id) where state in ('pending','open','operator_required');
create index checkout_workspace_history on public.checkout_attempts(workspace_id, first_requested_at desc);
create table public.billing_operator_holds (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
alter table public.checkout_attempts enable row level security;
alter table public.billing_operator_holds enable row level security;
revoke all on public.billing_customers, public.checkout_attempts, public.billing_operator_holds from public, anon, authenticated, service_role;
grant select on public.billing_customers, public.checkout_attempts, public.billing_operator_holds to service_role;
create policy billing_customer_owner on public.billing_customers for select to authenticated
  using (exists(select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));
create policy billing_attempt_owner on public.checkout_attempts for select to authenticated
  using (exists(select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));

-- Every mutation locks the workspace first, checks the asserted actor, and fences worker writes.
create function public.billing_checkout_step(
  p_actor_user_id uuid, p_workspace_id uuid, p_action text,
  p_id uuid default null, p_token uuid default null, p_key text default null,
  p_draft_id uuid default null, p_draft_version integer default null,
  p_customer_id text default null, p_session_id text default null,
  p_input jsonb default null, p_reason text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.billing_customers%rowtype; a public.checkout_attempts%rowtype; is_new boolean := false; valid_draft boolean; valid_requested boolean;
begin
  perform 1 from public.workspaces w where w.id = p_workspace_id and w.owner_user_id = p_actor_user_id for update;
  if not found then raise exception 'workspace unavailable' using errcode = '28000'; end if;
  if p_action = 'claim_customer' then
    select * into c from public.billing_customers where workspace_id = p_workspace_id for update;
    if not found then
      insert into public.billing_customers(workspace_id,idempotency_key,lease_token,lease_until)
        values(p_workspace_id,p_key,p_token,now()+interval '20 seconds') returning * into c;
      is_new := true;
    elsif c.customer_id is null and not c.recovery_required and (c.lease_until is null or c.lease_until < now()) then
      update public.billing_customers set lease_token = p_token, lease_until = now()+interval '20 seconds'
        where workspace_id = p_workspace_id returning * into c;
    end if;
    return pg_catalog.jsonb_build_object('row',pg_catalog.to_jsonb(c),'claimed',coalesce(c.lease_token=p_token and c.lease_until>now(),false),'created',is_new);
  elsif p_action = 'save_customer' then
    update public.billing_customers set customer_id=p_customer_id, lease_token=null, lease_until=null
      where workspace_id=p_workspace_id and lease_token=p_token and customer_id is null;
    return pg_catalog.jsonb_build_object('ok',found);
  elsif p_action = 'release_customer' then
    update public.billing_customers set lease_token=null, lease_until=null where workspace_id=p_workspace_id and lease_token=p_token;
    return pg_catalog.jsonb_build_object('ok',true);
  elsif p_action = 'customer' then
    select * into c from public.billing_customers where workspace_id=p_workspace_id;
    return pg_catalog.jsonb_build_object('row',case when found then pg_catalog.to_jsonb(c) else null end);
  elsif p_action = 'claim_attempt' then
    if exists(select 1 from public.billing_operator_holds where workspace_id=p_workspace_id) then
      return pg_catalog.jsonb_build_object('hold',true);
    end if;
    select * into a from public.checkout_attempts where workspace_id=p_workspace_id and state in ('pending','open','operator_required') for update;
    if not found then
      -- New purchases require the current mutable draft and the immutable usable snapshot.
      perform 1 from public.drafts d where d.id=p_draft_id and d.workspace_id=p_workspace_id for update;
      if not found then return pg_catalog.jsonb_build_object('invalid_draft',true); end if;
      select public.draft_snapshot_usable(p_actor_user_id,p_draft_id,p_draft_version) and exists(
        select 1 from public.drafts d where d.id=p_draft_id and d.workspace_id=p_workspace_id and d.version=p_draft_version
      ) into valid_draft;
      if not coalesce(valid_draft,false) then return pg_catalog.jsonb_build_object('invalid_draft',true); end if;
      select * into c from public.billing_customers where workspace_id=p_workspace_id;
      if c.customer_id is null or c.customer_id <> p_customer_id then raise exception 'customer mismatch'; end if;
      insert into public.checkout_attempts(id,workspace_id,draft_id,draft_version,customer_id,idempotency_key,lease_token,lease_until,input)
        values(p_id,p_workspace_id,p_draft_id,p_draft_version,p_customer_id,p_key,p_token,now()+interval '20 seconds',p_input)
        returning * into a;
      is_new := true;
    elsif a.lease_until is null or a.lease_until < now() then
      update public.checkout_attempts set lease_token=p_token,lease_until=now()+interval '20 seconds' where id=a.id returning * into a;
    end if;
    perform 1 from public.drafts d where d.id=a.draft_id and d.workspace_id=p_workspace_id for update;
    if found then
      select public.draft_snapshot_usable(p_actor_user_id,a.draft_id,a.draft_version) and exists(
        select 1 from public.drafts d where d.id=a.draft_id and d.workspace_id=p_workspace_id and d.version=a.draft_version
      ) into valid_draft;
    else valid_draft := false; end if;
    perform 1 from public.drafts d where d.id=p_draft_id and d.workspace_id=p_workspace_id for update;
    if found then
      select public.draft_snapshot_usable(p_actor_user_id,p_draft_id,p_draft_version) and exists(
        select 1 from public.drafts d where d.id=p_draft_id and d.workspace_id=p_workspace_id and d.version=p_draft_version
      ) into valid_requested;
    else valid_requested := false; end if;
    return pg_catalog.jsonb_build_object('row',pg_catalog.to_jsonb(a),'claimed',a.lease_token=p_token,'created',is_new,
      'draft_current',coalesce(valid_draft,false),'requested_current',coalesce(valid_requested,false));
  elsif p_action = 'mark_frequency' then
    update public.checkout_attempts set frequency_state=case when p_reason='ok' then 'ok' else 'denied' end,
      state=case when p_reason='ok' then state else 'closed' end
      where id=p_id and workspace_id=p_workspace_id and lease_token=p_token and frequency_state='pending';
    return pg_catalog.jsonb_build_object('ok',found);
  elsif p_action = 'save_session' then
    update public.checkout_attempts set session_id=p_session_id,state='open'
      where id=p_id and workspace_id=p_workspace_id and lease_token=p_token and session_id is null;
    return pg_catalog.jsonb_build_object('ok',found);
  elsif p_action = 'release_attempt' then
    update public.checkout_attempts set lease_token=null,lease_until=null where id=p_id and workspace_id=p_workspace_id and lease_token=p_token;
    return pg_catalog.jsonb_build_object('ok',true);
  elsif p_action = 'close_attempt' then
    update public.checkout_attempts set state='closed' where id=p_id and workspace_id=p_workspace_id and lease_token=p_token;
    return pg_catalog.jsonb_build_object('ok',found);
  elsif p_action = 'hold' then
    insert into public.billing_operator_holds(workspace_id,reason) values(p_workspace_id,coalesce(p_reason,'unknown'))
      on conflict(workspace_id) do nothing;
    update public.checkout_attempts set state='operator_required' where workspace_id=p_workspace_id and state in ('pending','open');
    update public.billing_customers set recovery_required=true where workspace_id=p_workspace_id and p_reason='unknown_customer';
    return pg_catalog.jsonb_build_object('ok',true);
  end if;
  raise exception 'unsupported billing action';
end;
$$;
revoke all on function public.billing_checkout_step(uuid,uuid,text,uuid,uuid,text,uuid,integer,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.billing_checkout_step(uuid,uuid,text,uuid,uuid,text,uuid,integer,text,text,jsonb,text) to service_role;
