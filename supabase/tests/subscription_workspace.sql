-- Run only against an explicitly disposable Supabase test database after the
-- migration. The transaction intentionally rolls back synthetic users/data.
begin;

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'workspace-a@example.test', '', now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'workspace-b@example.test', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select public.ensure_workspace();
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select public.ensure_workspace();

-- A browser session has SELECT only, and cannot call the mutation RPCs.
do $$ declare table_name text; begin
  if has_function_privilege('authenticated', 'public.save_draft(uuid,uuid,uuid,integer,jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.delete_draft(uuid,uuid,uuid)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.delete_workspace_analysis(uuid,uuid,uuid)', 'EXECUTE')
  then raise exception 'authenticated mutation privilege leaked'; end if;
  foreach table_name in array array[
    'public.workspaces', 'public.drafts', 'public.draft_versions', 'public.draft_revoked_materials',
    'public.workspace_analyses', 'public.workspace_post_edits', 'public.workspace_feedback', 'public.workspace_metrics'
  ] loop
    if has_table_privilege('authenticated', table_name, 'INSERT,UPDATE,DELETE')
      or has_table_privilege('service_role', table_name, 'INSERT,UPDATE,DELETE')
    then raise exception 'direct mutation privilege leaked on %', table_name; end if;
  end loop;
end $$;

set local role service_role;
select public.save_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  null, 0,
  '{"brand":null,"preferencias":{},"contexto":{"materiais":[{"id":"source-a"}]},"personalizacoes":{}}'::jsonb);
select set_config('test.draft_a',
  (select id::text from public.drafts where workspace_id =
    (select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
do $$ begin
  if exists (select 1 from public.drafts where id = current_setting('test.draft_a')::uuid)
    or exists (select 1 from public.draft_versions where draft_id = current_setting('test.draft_a')::uuid)
  then raise exception 'cross-account read leaked'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
do $$ begin
  if not exists (select 1 from public.drafts where id = current_setting('test.draft_a')::uuid)
    or not exists (select 1 from public.draft_versions where draft_id = current_setting('test.draft_a')::uuid)
  then raise exception 'owner cannot read draft/version'; end if;
end $$;

-- The privileged test runner seeds only rollback-local analysis fixtures;
-- service_role is deliberately denied direct DML on these tables.
set local role postgres;
do $$ begin
  begin
    insert into public.workspace_analyses(workspace_id, draft_id, draft_version, result)
    values ((select id from public.workspaces where owner_user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
      current_setting('test.draft_a')::uuid, 1, '{}'::jsonb);
    raise exception 'cross-workspace draft reference accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.workspace_analyses(workspace_id, draft_id, draft_version, result)
    values ((select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      current_setting('test.draft_a')::uuid, 99, '{}'::jsonb);
    raise exception 'nonexistent draft version accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.workspace_analyses(workspace_id, draft_id, result)
    values ((select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      current_setting('test.draft_a')::uuid, '{}'::jsonb);
    raise exception 'incomplete draft pair accepted';
  exception when check_violation then null; end;
end $$;
insert into public.workspace_analyses(workspace_id, draft_id, draft_version, result)
values ((select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  current_setting('test.draft_a')::uuid, 1, '{}'::jsonb);
select set_config('test.attached_analysis_a',
  (select id::text from public.workspace_analyses where draft_id = current_setting('test.draft_a')::uuid), true);
insert into public.workspace_analyses(workspace_id, result)
values ((select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), '{}'::jsonb);
select set_config('test.analysis_a',
  (select id::text from public.workspace_analyses where draft_id is null and workspace_id =
    (select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')), true);
insert into public.workspace_post_edits(analysis_id, post_id, edit)
values (current_setting('test.analysis_a')::uuid, 'post-1', '{}'::jsonb);
insert into public.workspace_feedback(analysis_id, post_id, decision)
values (current_setting('test.analysis_a')::uuid, 'post-1', 'aprovado');
insert into public.workspace_metrics(analysis_id, post_id, data)
values (current_setting('test.analysis_a')::uuid, 'post-1', '{}'::jsonb);
set local role service_role;
do $$ begin
  if public.delete_workspace_analysis('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    (select id from public.workspaces where owner_user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    current_setting('test.analysis_a')::uuid)
  then raise exception 'cross-account analysis delete accepted'; end if;
  if not public.delete_workspace_analysis('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    current_setting('test.analysis_a')::uuid)
  then raise exception 'owner analysis delete failed'; end if;
  if exists (select 1 from public.workspace_post_edits where analysis_id = current_setting('test.analysis_a')::uuid)
    or exists (select 1 from public.workspace_feedback where analysis_id = current_setting('test.analysis_a')::uuid)
    or exists (select 1 from public.workspace_metrics where analysis_id = current_setting('test.analysis_a')::uuid)
  then raise exception 'private analysis dependents survived deletion'; end if;
end $$;

set local role service_role;
do $$ declare result jsonb; begin
  select public.save_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    current_setting('test.draft_a')::uuid, 1,
    '{"brand":null,"preferencias":{},"contexto":null,"personalizacoes":{}}'::jsonb) into result;
  if result->>'status' <> 'ok' then raise exception 'version 2 save failed'; end if;
  select public.save_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    current_setting('test.draft_a')::uuid, 1,
    '{"brand":null,"preferencias":{},"contexto":null,"personalizacoes":{}}'::jsonb) into result;
  if result->>'status' <> 'conflict' then raise exception 'stale version accepted'; end if;
  if public.draft_snapshot_usable('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_setting('test.draft_a')::uuid, 1)
  then raise exception 'revoked source usable from old snapshot'; end if;
  if public.delete_draft('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    (select id from public.workspaces where owner_user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    current_setting('test.draft_a')::uuid)
  then raise exception 'cross-account delete accepted'; end if;
  if not public.delete_draft('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (select id from public.workspaces where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    current_setting('test.draft_a')::uuid)
  then raise exception 'owner delete failed'; end if;
  if exists (select 1 from public.draft_versions where draft_id = current_setting('test.draft_a')::uuid)
  then raise exception 'version data survived deletion'; end if;
  if not exists (select 1 from public.workspace_analyses
    where id = current_setting('test.attached_analysis_a')::uuid
      and draft_id is null and draft_version is null)
  then raise exception 'draft deletion did not detach retained analysis'; end if;
end $$;
-- Rejected A reintroduction must not revoke B from the accepted version.
do $$ declare actor uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; w uuid; d uuid; r jsonb; before_body jsonb;
begin
  select id into w from public.workspaces where owner_user_id=actor;
  r := public.save_draft(actor,w,null,0,'{"brand":null,"preferencias":{},"contexto":{"materiais":[{"id":"A"},{"id":"B"}]},"personalizacoes":{}}');
  d := (r->'draft'->>'id')::uuid;
  r := public.save_draft(actor,w,d,1,'{"brand":null,"preferencias":{},"contexto":{"materiais":[{"id":"B"}]},"personalizacoes":{}}');
  before_body := r->'draft'->'body';
  r := public.save_draft(actor,w,d,2,'{"brand":null,"preferencias":{},"contexto":{"materiais":[{"id":"A"}]},"personalizacoes":{}}');
  if r->>'status' is distinct from 'revoked'
    or not exists(select 1 from public.drafts where id=d and version=2 and body=before_body)
    or (select count(*) from public.draft_versions where draft_id=d) <> 2
    or (select array_agg(material_id order by material_id) from public.draft_revoked_materials where draft_id=d) is distinct from array['A']::text[]
    or not public.draft_snapshot_usable(actor,d,2)
  then raise exception 'rejected save mutated accepted draft/revocations/usability'; end if;
end $$;
rollback;
