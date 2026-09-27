-- Additive private workspace schema. Apply only to the intended project after review.
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version integer not null check (version > 0),
  body jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create index drafts_workspace_idx on public.drafts(workspace_id);
create table public.draft_versions (
  draft_id uuid not null,
  workspace_id uuid not null,
  version integer not null check (version > 0),
  body jsonb not null,
  created_at timestamptz not null default now(),
  primary key (draft_id, version),
  unique (workspace_id, draft_id, version),
  foreign key (workspace_id, draft_id) references public.drafts(workspace_id, id) on delete cascade
);
create table public.draft_revoked_materials (
  draft_id uuid not null references public.drafts(id) on delete cascade,
  material_id text not null,
  revoked_at timestamptz not null default now(),
  primary key (draft_id, material_id)
);
create table public.workspace_analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  draft_id uuid,
  draft_version integer,
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint analysis_draft_pair check ((draft_id is null) = (draft_version is null)),
  constraint analysis_existing_workspace_version foreign key (workspace_id, draft_id, draft_version)
    references public.draft_versions(workspace_id, draft_id, version)
    on delete set null (draft_id, draft_version)
);
create table public.workspace_post_edits (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.workspace_analyses(id) on delete cascade,
  post_id text not null,
  edit jsonb not null,
  unique (analysis_id, post_id)
);
create table public.workspace_feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.workspace_analyses(id) on delete cascade,
  post_id text not null,
  decision text not null check (decision in ('aprovado', 'pulado')),
  created_at timestamptz not null default now()
);
create table public.workspace_metrics (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.workspace_analyses(id) on delete cascade,
  post_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.drafts enable row level security;
alter table public.draft_versions enable row level security;
alter table public.draft_revoked_materials enable row level security;
alter table public.workspace_analyses enable row level security;
alter table public.workspace_post_edits enable row level security;
alter table public.workspace_feedback enable row level security;
alter table public.workspace_metrics enable row level security;

-- Authenticated sessions can read only their own rows. Mutation is confined to
-- server-only service-role RPCs, so direct writes cannot skip version checks.
revoke all on public.workspaces, public.drafts, public.draft_versions,
  public.draft_revoked_materials, public.workspace_analyses,
  public.workspace_post_edits, public.workspace_feedback, public.workspace_metrics
  from public, anon, authenticated;
grant select on public.workspaces, public.drafts, public.draft_versions,
  public.draft_revoked_materials, public.workspace_analyses,
  public.workspace_post_edits, public.workspace_feedback, public.workspace_metrics to authenticated;
grant select on public.workspaces, public.drafts, public.draft_versions,
  public.draft_revoked_materials, public.workspace_analyses,
  public.workspace_post_edits, public.workspace_feedback, public.workspace_metrics to service_role;
revoke insert, update, delete on public.workspaces, public.drafts, public.draft_versions,
  public.draft_revoked_materials, public.workspace_analyses,
  public.workspace_post_edits, public.workspace_feedback, public.workspace_metrics from service_role;

create policy workspace_owner on public.workspaces for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy drafts_owner on public.drafts for select to authenticated
  using (exists (select 1 from public.workspaces w where w.id = drafts.workspace_id and w.owner_user_id = (select auth.uid())));
create policy versions_owner on public.draft_versions for select to authenticated
  using (exists (select 1 from public.drafts d join public.workspaces w on w.id = d.workspace_id
    where d.id = draft_versions.draft_id and w.owner_user_id = (select auth.uid())));
create policy revoked_owner on public.draft_revoked_materials for select to authenticated
  using (exists (select 1 from public.drafts d join public.workspaces w on w.id = d.workspace_id
    where d.id = draft_revoked_materials.draft_id and w.owner_user_id = (select auth.uid())));
create policy analyses_owner on public.workspace_analyses for select to authenticated
  using (exists (select 1 from public.workspaces w where w.id = workspace_analyses.workspace_id and w.owner_user_id = (select auth.uid())));
create policy edits_owner on public.workspace_post_edits for select to authenticated
  using (exists (select 1 from public.workspace_analyses a join public.workspaces w on w.id = a.workspace_id
    where a.id = workspace_post_edits.analysis_id and w.owner_user_id = (select auth.uid())));
create policy feedback_owner on public.workspace_feedback for select to authenticated
  using (exists (select 1 from public.workspace_analyses a join public.workspaces w on w.id = a.workspace_id
    where a.id = workspace_feedback.analysis_id and w.owner_user_id = (select auth.uid())));
create policy metrics_owner on public.workspace_metrics for select to authenticated
  using (exists (select 1 from public.workspace_analyses a join public.workspaces w on w.id = a.workspace_id
    where a.id = workspace_metrics.analysis_id and w.owner_user_id = (select auth.uid())));

create function public.ensure_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); workspace uuid;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  insert into public.workspaces(owner_user_id) values (actor)
    on conflict (owner_user_id) do nothing;
  select id into workspace from public.workspaces where owner_user_id = actor;
  if workspace is null then raise exception 'workspace unavailable'; end if;
  return workspace;
end $$;
revoke all on function public.ensure_workspace() from public, anon;
grant execute on function public.ensure_workspace() to authenticated;

-- Extract IDs from both context copies. Raw uploaded bytes are never accepted
-- in the body contract; only bounded extracted facts/text may be retained.
create function public.draft_material_ids(p_body jsonb) returns table(material_id text)
language sql immutable set search_path = '' as $$
  select distinct x.item->>'id' from (
    select value as item from pg_catalog.jsonb_array_elements(coalesce(p_body->'contexto'->'materiais', '[]'::jsonb))
    union all
    select value as item from pg_catalog.jsonb_array_elements(coalesce(p_body->'preferencias'->'contexto_empresa'->'materiais', '[]'::jsonb))
  ) x where pg_catalog.jsonb_typeof(x.item) = 'object' and x.item ? 'id';
$$;
revoke all on function public.draft_material_ids(jsonb) from public, anon, authenticated;

create function public.save_draft(p_actor_user_id uuid, p_workspace_id uuid, p_draft_id uuid,
  p_expected_version integer, p_body jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare current_row public.drafts%rowtype; new_id uuid; new_version integer;
begin
  if p_actor_user_id is null or not exists
    (select 1 from public.workspaces where id = p_workspace_id and owner_user_id = p_actor_user_id)
  then return pg_catalog.jsonb_build_object('status', 'missing'); end if;
  if p_body is null or pg_catalog.jsonb_typeof(p_body) <> 'object'
    or pg_catalog.octet_length(p_body::text) > 150000
    or not (p_body ?& array['brand','preferencias','contexto','personalizacoes'])
    or pg_catalog.jsonb_typeof(p_body->'preferencias') <> 'object'
    or pg_catalog.jsonb_typeof(p_body->'personalizacoes') <> 'object'
    or (p_body->'brand' <> 'null'::jsonb and pg_catalog.jsonb_typeof(p_body->'brand') <> 'object')
    or (p_body->'contexto' <> 'null'::jsonb and pg_catalog.jsonb_typeof(p_body->'contexto') <> 'object')
  then raise exception 'invalid draft body' using errcode = '22023'; end if;
  if p_draft_id is null then
    if p_expected_version <> 0 then return pg_catalog.jsonb_build_object('status', 'conflict'); end if;
    insert into public.drafts(workspace_id, version, body) values (p_workspace_id, 1, p_body)
      returning id into new_id;
    new_version := 1;
  else
    select * into current_row from public.drafts where id = p_draft_id for update;
    if not found or current_row.workspace_id <> p_workspace_id
      then return pg_catalog.jsonb_build_object('status', 'missing'); end if;
    if current_row.version <> p_expected_version
      then return pg_catalog.jsonb_build_object('status', 'conflict'); end if;
    if exists (select 1 from public.draft_revoked_materials r
      join public.draft_material_ids(p_body) ids on ids.material_id = r.material_id
      where r.draft_id = p_draft_id)
    then return pg_catalog.jsonb_build_object('status', 'revoked'); end if;
    insert into public.draft_revoked_materials(draft_id, material_id)
      select p_draft_id, old_ids.material_id from public.draft_material_ids(current_row.body) old_ids
      where not exists (select 1 from public.draft_material_ids(p_body) new_ids
        where new_ids.material_id = old_ids.material_id)
      on conflict do nothing;
    new_id := p_draft_id;
    new_version := current_row.version + 1;
    update public.drafts set version = new_version, body = p_body, updated_at = pg_catalog.now()
      where id = new_id;
  end if;
  insert into public.draft_versions(draft_id, workspace_id, version, body)
    values (new_id, p_workspace_id, new_version, p_body);
  return pg_catalog.jsonb_build_object('status', 'ok', 'draft',
    pg_catalog.jsonb_build_object('id', new_id, 'workspace_id', p_workspace_id,
      'version', new_version, 'body', p_body));
end $$;
revoke all on function public.save_draft(uuid, uuid, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.save_draft(uuid, uuid, uuid, integer, jsonb) to service_role;

create function public.delete_draft(p_actor_user_id uuid, p_workspace_id uuid, p_draft_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.drafts d using public.workspaces w
    where d.id = p_draft_id and d.workspace_id = p_workspace_id
      and w.id = d.workspace_id and w.owner_user_id = p_actor_user_id;
  return found;
end $$;
revoke all on function public.delete_draft(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_draft(uuid, uuid, uuid) to service_role;

-- Removing one private analysis cascades only through its private dependent rows.
create function public.delete_workspace_analysis(p_actor_user_id uuid, p_workspace_id uuid, p_analysis_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  delete from public.workspace_analyses a using public.workspaces w
    where a.id = p_analysis_id and a.workspace_id = p_workspace_id
      and w.id = a.workspace_id and w.owner_user_id = p_actor_user_id;
  return found;
end $$;
revoke all on function public.delete_workspace_analysis(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_workspace_analysis(uuid, uuid, uuid) to service_role;

-- A prior checkout/version can no longer feed generation after source removal.
create function public.draft_snapshot_usable(p_actor_user_id uuid, p_draft_id uuid, p_version integer)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.draft_versions v
      join public.drafts d on d.id = v.draft_id
      join public.workspaces w on w.id = d.workspace_id
    where v.draft_id = p_draft_id and v.version = p_version and w.owner_user_id = p_actor_user_id
      and not exists (select 1 from public.draft_revoked_materials r
        join public.draft_material_ids(v.body) ids on ids.material_id = r.material_id
        where r.draft_id = p_draft_id)
  );
$$;
revoke all on function public.draft_snapshot_usable(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.draft_snapshot_usable(uuid, uuid, integer) to service_role;
