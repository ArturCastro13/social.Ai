-- Apply after 202609260001. Privileged runner only; no end-user entitlement writer.
create table public.workspace_billing_access (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  status text not null default 'none' check (status in ('none','incomplete','incomplete_expired','trialing','active','past_due','unpaid','paused','canceled')),
  paid_from timestamptz,
  paid_through timestamptz,
  cancel_at_period_end boolean not null default false,
  risk_hold boolean not null default false,
  check ((paid_from is null) = (paid_through is null)),
  check (paid_from is null or paid_from < paid_through)
);
alter table public.workspace_billing_access enable row level security;
revoke all on public.workspace_billing_access from public, anon, authenticated;
grant select on public.workspace_billing_access to authenticated, service_role;
revoke insert, update, delete on public.workspace_billing_access from service_role;
create policy billing_access_owner on public.workspace_billing_access for select to authenticated
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));

insert into public.workspace_billing_access(workspace_id) select id from public.workspaces on conflict do nothing;
create function public.initialize_workspace_billing_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.workspace_billing_access(workspace_id) values (new.id);
  return new;
end $$;
revoke all on function public.initialize_workspace_billing_access() from public, anon, authenticated, service_role;
create trigger workspace_billing_access_insert after insert on public.workspaces
  for each row execute function public.initialize_workspace_billing_access();

create table public.usage_operations (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  operation_id uuid not null,
  kind text not null check (kind in ('material_extract','context_analyze','competitor_suggest','preview_generate','week_generate','image_generate')),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  draft_id uuid not null,
  draft_version integer not null check (draft_version > 0),
  tier text not null check (tier in ('free','paid')),
  period_start timestamptz,
  period_end timestamptz,
  state text not null check (state in ('reserved','started','completed','uncertain','released')),
  result_id uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  primary key(workspace_id, operation_id),
  check ((tier = 'free' and period_start is null and period_end is null) or
    (tier = 'paid' and period_start is not null and period_end is not null)),
  check (state <> 'completed' or result_id is not null)
);
create index usage_quota_idx on public.usage_operations(workspace_id, tier, kind, period_start, period_end)
  where state <> 'released';
create index usage_daily_idx on public.usage_operations(created_at) where state <> 'released';
alter table public.usage_operations enable row level security;
revoke all on public.usage_operations from public, anon, authenticated;
grant select on public.usage_operations to authenticated, service_role;
revoke insert, update, delete on public.usage_operations from service_role;
create policy usage_owner on public.usage_operations for select to authenticated
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = (select auth.uid())));

-- This row serializes reservations across workspaces. 60 is a conservative
-- unit cap on new provider operations, not a precise dollar budget.
create table public.usage_global_days(day date primary key);
revoke all on public.usage_global_days from public, anon, authenticated, service_role;

create function public.reserve_workspace_usage(p_actor_user_id uuid, p_workspace_id uuid,
  p_operation_id uuid, p_kind text, p_draft_id uuid, p_draft_version integer,
  p_request_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare prior public.usage_operations%rowtype; access_row public.workspace_billing_access%rowtype;
  v_tier text; v_start timestamptz; v_end timestamptz; v_limit integer;
  v_day date := (pg_catalog.now() at time zone 'UTC')::date;
  v_day_start timestamptz := ((pg_catalog.now() at time zone 'UTC')::date::timestamp at time zone 'UTC');
  v_used integer;
begin
  if p_actor_user_id is null or p_workspace_id is null or p_operation_id is null
    or p_draft_id is null or p_draft_version < 1 or p_request_hash !~ '^[0-9a-f]{64}$'
    or p_kind not in ('material_extract','context_analyze','competitor_suggest','preview_generate','week_generate','image_generate')
  then raise exception 'invalid usage input' using errcode = '22023'; end if;
  perform 1 from public.workspaces w where w.id = p_workspace_id and w.owner_user_id = p_actor_user_id for update;
  if not found then raise exception 'workspace unavailable' using errcode = '28000'; end if;
  select * into prior from public.usage_operations
    where workspace_id = p_workspace_id and operation_id = p_operation_id;
  if found then
    if prior.request_hash <> p_request_hash or prior.kind <> p_kind or prior.draft_id <> p_draft_id or prior.draft_version <> p_draft_version
    then return pg_catalog.jsonb_build_object('status','conflict'); end if;
    return pg_catalog.jsonb_build_object('status','ok','operation_id',prior.operation_id,
      'state',prior.state,'result_id',prior.result_id,'request_hash',prior.request_hash);
  end if;
  -- A historical operation remains readable after source revocation or draft
  -- deletion. Only a NEW reservation needs a currently usable snapshot.
  perform 1 from public.drafts d where d.id = p_draft_id and d.workspace_id = p_workspace_id for update;
  if not found or not public.draft_snapshot_usable(p_actor_user_id, p_draft_id, p_draft_version)
  then return pg_catalog.jsonb_build_object('status','conflict'); end if;
  select * into access_row from public.workspace_billing_access where workspace_id = p_workspace_id for update;
  if not found then raise exception 'billing access unavailable'; end if;
  if access_row.risk_hold then return pg_catalog.jsonb_build_object('status','quota'); end if;
  if access_row.status in ('active','past_due') then
    if access_row.risk_hold or access_row.paid_from is null or access_row.paid_through is null
      or pg_catalog.clock_timestamp() < access_row.paid_from or pg_catalog.clock_timestamp() >= access_row.paid_through
    then return pg_catalog.jsonb_build_object('status','quota'); end if;
    v_tier := 'paid'; v_start := access_row.paid_from; v_end := access_row.paid_through;
  elsif access_row.status in ('none','canceled','incomplete_expired') then
    v_tier := 'free'; v_start := null; v_end := null;
  else
    return pg_catalog.jsonb_build_object('status','quota');
  end if;
  v_limit := case
    when v_tier = 'free' then case p_kind
      when 'material_extract' then 3 when 'context_analyze' then 2 when 'competitor_suggest' then 1
      when 'preview_generate' then 1 when 'week_generate' then 0 when 'image_generate' then 1 end
    else case p_kind
      when 'material_extract' then 10 when 'context_analyze' then 10 when 'competitor_suggest' then 10
      when 'preview_generate' then 0 when 'week_generate' then 4 when 'image_generate' then 24 end
  end;
  select count(*) into v_used from public.usage_operations u
    where u.workspace_id = p_workspace_id and u.kind = p_kind and u.tier = v_tier
      and u.period_start is not distinct from v_start and u.period_end is not distinct from v_end
      and u.state <> 'released';
  if v_used >= v_limit then return pg_catalog.jsonb_build_object('status','quota'); end if;
  select count(*) into v_used from public.usage_operations u
    where u.workspace_id = p_workspace_id and u.created_at >= pg_catalog.now() - interval '1 hour'
      and u.state <> 'released';
  if v_used >= 30 then return pg_catalog.jsonb_build_object('status','quota'); end if;
  insert into public.usage_global_days(day) values(v_day) on conflict do nothing;
  perform 1 from public.usage_global_days where day = v_day for update;
  select count(*) into v_used from public.usage_operations u
    where u.created_at >= v_day_start and u.created_at < v_day_start + interval '1 day' and u.state <> 'released';
  if v_used >= 60 then return pg_catalog.jsonb_build_object('status','quota'); end if;
  insert into public.usage_operations(workspace_id,operation_id,kind,request_hash,draft_id,draft_version,tier,period_start,period_end,state)
    values(p_workspace_id,p_operation_id,p_kind,p_request_hash,p_draft_id,p_draft_version,v_tier,v_start,v_end,'reserved');
  return pg_catalog.jsonb_build_object('status','ok','operation_id',p_operation_id,
    'state','reserved','result_id',null,'request_hash',p_request_hash);
end $$;
revoke all on function public.reserve_workspace_usage(uuid,uuid,uuid,text,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.reserve_workspace_usage(uuid,uuid,uuid,text,uuid,integer,text) to service_role;

create function public.transition_workspace_usage(p_actor_user_id uuid, p_workspace_id uuid,
  p_operation_id uuid, p_from text, p_to text, p_result_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare prior public.usage_operations%rowtype; access_row public.workspace_billing_access%rowtype;
  gate_time timestamptz;
begin
  if not ((p_from = 'reserved' and p_to in ('started','released') and p_result_id is null)
    or (p_from = 'started' and p_to = 'uncertain' and p_result_id is null)
    or (p_from = 'started' and p_to = 'completed' and p_result_id is not null))
  then return false; end if;
  perform 1 from public.workspaces w where w.id = p_workspace_id and w.owner_user_id = p_actor_user_id for update;
  if not found then return false; end if;
  select * into prior from public.usage_operations u
    where u.workspace_id = p_workspace_id and u.operation_id = p_operation_id for update;
  if not found or prior.state <> p_from then return false; end if;
  if p_to = 'started' then
    -- save_draft and delete_draft lock this row, so source removal cannot race
    -- between snapshot validation and the started transition.
    perform 1 from public.drafts d where d.id = prior.draft_id and d.workspace_id = p_workspace_id for update;
    if not found or not public.draft_snapshot_usable(p_actor_user_id, prior.draft_id, prior.draft_version)
    then return false; end if;
    select * into access_row from public.workspace_billing_access where workspace_id = p_workspace_id for update;
    if not found or access_row.risk_hold then return false; end if;
    gate_time := pg_catalog.clock_timestamp();
    if prior.tier = 'paid' then
      if access_row.status not in ('active','past_due')
        or access_row.paid_from is distinct from prior.period_start
        or access_row.paid_through is distinct from prior.period_end
        or gate_time < access_row.paid_from or gate_time >= access_row.paid_through
      then return false; end if;
    elsif access_row.status not in ('none','canceled','incomplete_expired') then
      return false;
    end if;
  end if;
  update public.usage_operations u set state = p_to, result_id = p_result_id,
    started_at = case when p_to = 'started' then pg_catalog.now() else started_at end,
    finished_at = case when p_to in ('completed','uncertain','released') then pg_catalog.now() else finished_at end
    where u.workspace_id = p_workspace_id and u.operation_id = p_operation_id and u.state = p_from;
  return found;
end $$;
revoke all on function public.transition_workspace_usage(uuid,uuid,uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.transition_workspace_usage(uuid,uuid,uuid,text,text,uuid) to service_role;

-- Generic persistent frequency bucket. Caller supplies HMAC, never raw identity.
create table public.workspace_frequency (
  action text not null, identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null, count integer not null check (count > 0),
  primary key(action,identity_hash,window_start)
);
revoke all on public.workspace_frequency from public, anon, authenticated, service_role;
create function public.reserve_workspace_frequency(p_action text, p_identity_hash text,
  p_window_seconds integer, p_limit integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_start timestamptz; v_count integer;
begin
  if p_action not in ('otp_send','otp_verify','checkout','provider') or p_identity_hash !~ '^[0-9a-f]{64}$'
    or p_window_seconds < 60 or p_window_seconds > 86400 or p_limit < 1 or p_limit > 100
  then raise exception 'invalid frequency input' using errcode = '22023'; end if;
  v_start := pg_catalog.to_timestamp(pg_catalog.floor(pg_catalog.date_part('epoch', pg_catalog.now()) / p_window_seconds) * p_window_seconds);
  insert into public.workspace_frequency(action,identity_hash,window_start,count)
    values(p_action,p_identity_hash,v_start,1)
    on conflict(action,identity_hash,window_start) do update set count = public.workspace_frequency.count + 1
    where public.workspace_frequency.count < p_limit
    returning count into v_count;
  return v_count is not null;
end $$;
revoke all on function public.reserve_workspace_frequency(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.reserve_workspace_frequency(text,text,integer,integer) to service_role;
