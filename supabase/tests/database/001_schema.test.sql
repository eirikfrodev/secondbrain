begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

select has_extension('pg_jsonschema', 'database JSON Schema validation is enabled');

select has_table('public', 'workspaces', 'workspaces exists');
select has_table('public', 'workspace_memberships', 'workspace memberships exist');
select has_table('public', 'source_records', 'source records exist');
select has_table('public', 'projects', 'projects exist');
select has_table('public', 'project_notes', 'project notes exist');
select has_table('public', 'items', 'items exist');
select has_table('public', 'item_revisions', 'item revisions exist');
select has_table('public', 'actions', 'actions exist');
select has_table('public', 'ai_jobs', 'AI jobs exist');
select has_table('public', 'audit_events', 'audit events exist');
select has_table('public', 'source_health', 'source health exists');
select has_table('private', 'item_revision_sources', 'normalized revision evidence edges exist');

select is(
  (
    select count(*)::integer
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'workspaces', 'workspace_memberships', 'source_records', 'projects', 'project_notes',
        'items', 'item_revisions', 'actions', 'ai_jobs', 'audit_events', 'source_health'
      )
      and relation.relrowsecurity
  ),
  11,
  'RLS is enabled on every Phase 2 public table'
);

select has_index('public', 'items', 'items_workspace_tier_rank_idx', 'dashboard index exists');
select has_index('public', 'ai_jobs', 'ai_jobs_workspace_status_queue_idx', 'AI queue index exists');
select has_index('public', 'audit_events', 'audit_events_workspace_created_idx', 'audit timeline index exists');
select has_index('public', 'source_health', 'source_health_workspace_status_idx', 'source-health index exists');
select has_index('public', 'actions', 'actions_one_recommended_per_revision_idx', 'one recommended action index exists');
select has_index('public', 'item_revisions', 'item_revisions_source_ref_ids_idx', 'revision evidence lookup index exists');
select has_column('public', 'ai_jobs', 'requested_by_user_id', 'AI jobs record the requesting user');

select ok(
  not has_table_privilege('anon', 'public.items', 'select'),
  'anonymous callers cannot read items'
);
select ok(
  has_table_privilege('authenticated', 'public.items', 'select'),
  'authenticated callers may read rows allowed by RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.items', 'insert,update,delete'),
  'authenticated callers cannot mutate item tables directly'
);
select ok(
  not has_function_privilege('anon', 'public.queue_item_ask(uuid,text)', 'execute'),
  'anonymous callers cannot queue Ask jobs'
);
select ok(
  has_function_privilege('authenticated', 'public.queue_item_ask(uuid,text)', 'execute'),
  'authenticated callers can use the narrow inline Ask function'
);

select is(
  (
    select count(*)::integer
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename in ('items', 'item_revisions', 'actions', 'ai_jobs', 'source_health')
  ),
  5,
  'all available Phase 2 change tables are published to Realtime'
);
select ok(
  not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename in ('workspace_memberships', 'source_records')
  ),
  'membership and source-evidence tables are not published'
);

select * from finish();
rollback;
