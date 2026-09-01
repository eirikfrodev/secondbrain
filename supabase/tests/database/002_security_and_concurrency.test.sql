begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
set constraints items_current_revision_fk deferred;

select plan(43);

-- This rollback-only test uses synthetic JWT subjects to exercise multi-user
-- RLS. The pgTAP role does not own Supabase's auth.users table, so remove the
-- application-table Auth foreign keys inside this transaction instead of
-- weakening or disabling the production owner-admission trigger.
alter table public.workspaces
  drop constraint workspaces_owner_user_id_fkey;
alter table public.workspace_memberships
  drop constraint workspace_memberships_user_id_fkey;
alter table public.ai_jobs
  drop constraint ai_jobs_requested_by_user_id_fkey;

insert into public.workspaces (id, owner_user_id, name, kind) values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner personal', 'personal'),
  ('22222222-2222-4222-8222-222222222222', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Outsider personal', 'personal');

insert into public.workspace_memberships (workspace_id, user_id, role)
values ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'member');

insert into public.source_records (
  id, workspace_id, provider, source_type, resolution, title
) values
  ('66666666-6666-4666-8666-666666666661', '11111111-1111-4111-8111-111111111111', 'manual', 'manual', 'exact', 'Owner source'),
  ('66666666-6666-4666-8666-666666666662', '22222222-2222-4222-8222-222222222222', 'manual', 'manual', 'exact', 'Outsider source');

insert into public.source_health (
  workspace_id, source_key, label, status, next_expected_at
) values
  ('11111111-1111-4111-8111-111111111111', 'utsikt_operator', 'Utsikt operator', 'healthy', now() + interval '1 hour'),
  ('22222222-2222-4222-8222-222222222222', 'utsikt_operator', 'Utsikt operator', 'healthy', now() + interval '1 hour');

insert into public.items (
  id, workspace_id, stable_key, version, state, tier, priority, attention_rank,
  title_lead, situation, recommendation, requires_user_attention, current_revision_id
) values
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'manual:test-item',
    1,
    'needs_you',
    'needs_you',
    80,
    1,
    'Test item',
    'Needs a safe persistence test.',
    'Keep the history append-only.',
    true,
    '44444444-4444-4444-8444-444444444441'
  ),
  (
    '33333333-3333-4333-8333-333333333334',
    '22222222-2222-4222-8222-222222222222',
    'manual:outsider-item',
    1,
    'waiting',
    'waiting',
    40,
    1,
    'Outsider item',
    'Must remain isolated.',
    null,
    false,
    '44444444-4444-4444-8444-444444444442'
  );

insert into public.item_revisions (
  id, item_id, version, document, source_ref_ids, created_by
) values
  (
    '44444444-4444-4444-8444-444444444441',
    '33333333-3333-4333-8333-333333333333',
    1,
    '{"schemaVersion":1,"spine":{"titleLead":"Test item","situation":"Needs a safe persistence test.","recommendation":"Keep the history append-only.","stateLabel":"Needs you","sourceLabel":null,"sourceTime":null},"blocks":[],"actionIds":[],"ask":{"enabled":true}}',
    array['66666666-6666-4666-8666-666666666661'::uuid],
    'system'
  ),
  (
    '44444444-4444-4444-8444-444444444442',
    '33333333-3333-4333-8333-333333333334',
    1,
    '{"schemaVersion":1,"spine":{"titleLead":"Outsider item","situation":"Must remain isolated.","recommendation":null,"stateLabel":"Waiting","sourceLabel":null,"sourceTime":null},"blocks":[],"actionIds":[],"ask":{"enabled":true}}',
    array['66666666-6666-4666-8666-666666666662'::uuid],
    'system'
  );

insert into public.ai_jobs (
  id, workspace_id, item_id, requested_by_user_id, instruction, origin, status, queued_for
) values
  (
    '77777777-7777-4777-8777-777777777771',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    null,
    'Run the trusted operator cycle',
    'operator',
    'queued',
    now() + interval '1 hour'
  ),
  (
    '77777777-7777-4777-8777-777777777772',
    '22222222-2222-4222-8222-222222222222',
    null,
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Keep this Ask private',
    'global_ask',
    'queued',
    now() + interval '1 hour'
  );

select is(
  (select count(*)::integer from public.workspace_memberships where role = 'owner'),
  2,
  'workspace creation atomically creates owner membership'
);
select is(
  (select count(*)::integer from private.item_revision_sources),
  2,
  'revision inserts create normalized evidence edges'
);

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select results_eq(
  $$ select id from public.workspaces order by id $$,
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid) $$,
  'owner sees the exact owner workspace'
);
select results_eq(
  $$ select user_id from public.workspace_memberships order by user_id $$,
  $$ values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$,
  'owner cannot enumerate another member'
);
select results_eq(
  $$ select id from public.source_records order by id $$,
  $$ values ('66666666-6666-4666-8666-666666666661'::uuid) $$,
  'owner sees only owner source evidence'
);
select results_eq(
  $$ select id from public.items order by id $$,
  $$ values ('33333333-3333-4333-8333-333333333333'::uuid) $$,
  'owner sees only owner items'
);
select results_eq(
  $$ select id from public.item_revisions order by id $$,
  $$ values ('44444444-4444-4444-8444-444444444441'::uuid) $$,
  'owner sees only owner revisions'
);
select results_eq(
  $$ select id from public.ai_jobs order by id $$,
  $$ values ('77777777-7777-4777-8777-777777777771'::uuid) $$,
  'owner sees only owner jobs'
);

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select results_eq(
  $$ select id from public.workspaces order by id $$,
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid) $$,
  'member sees the exact shared workspace'
);
select results_eq(
  $$ select user_id from public.workspace_memberships order by user_id $$,
  $$ values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid) $$,
  'member sees only their own membership'
);
select results_eq(
  $$ select id from public.source_records order by id $$,
  $$ values ('66666666-6666-4666-8666-666666666661'::uuid) $$,
  'member sees only shared-workspace source evidence'
);
select results_eq(
  $$ select id from public.items order by id $$,
  $$ values ('33333333-3333-4333-8333-333333333333'::uuid) $$,
  'member sees only shared-workspace items'
);
select results_eq(
  $$ select id from public.item_revisions order by id $$,
  $$ values ('44444444-4444-4444-8444-444444444441'::uuid) $$,
  'member sees only shared-workspace revisions'
);
select results_eq(
  $$ select id from public.ai_jobs order by id $$,
  $$ values ('77777777-7777-4777-8777-777777777771'::uuid) $$,
  'member sees only shared-workspace jobs'
);

select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
select results_eq(
  $$ select id from public.workspaces order by id $$,
  $$ values ('22222222-2222-4222-8222-222222222222'::uuid) $$,
  'outsider sees the exact outsider workspace'
);
select results_eq(
  $$ select user_id from public.workspace_memberships order by user_id $$,
  $$ values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid) $$,
  'outsider sees only their own membership'
);
select results_eq(
  $$ select id from public.source_records order by id $$,
  $$ values ('66666666-6666-4666-8666-666666666662'::uuid) $$,
  'outsider sees only outsider source evidence'
);
select results_eq(
  $$ select id from public.items order by id $$,
  $$ values ('33333333-3333-4333-8333-333333333334'::uuid) $$,
  'outsider sees only outsider items'
);
select results_eq(
  $$ select id from public.item_revisions order by id $$,
  $$ values ('44444444-4444-4444-8444-444444444442'::uuid) $$,
  'outsider sees only outsider revisions'
);
select results_eq(
  $$ select id from public.ai_jobs order by id $$,
  $$ values ('77777777-7777-4777-8777-777777777772'::uuid) $$,
  'outsider sees only outsider jobs'
);

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select lives_ok(
  $$ select public.queue_item_ask('33333333-3333-4333-8333-333333333333', 'Keep this attached to the item') $$,
  'owner can queue an inline Ask through the narrow function'
);
select is(
  (select count(*)::integer from public.ai_jobs where origin = 'inline_ask' and status = 'queued'),
  1,
  'Ask creates one queued user job'
);
select is(
  (select queued_for from public.ai_jobs where origin = 'inline_ask'),
  (select next_expected_at from public.source_health where source_key = 'utsikt_operator'),
  'queued receipt uses the trusted next operator sync'
);

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select throws_ok(
  $$ select public.cancel_ai_job((select id from public.ai_jobs where origin = 'inline_ask')) $$,
  '42501',
  'AI job cannot be cancelled by this user',
  'a member cannot cancel another member request'
);

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select throws_ok(
  $$ select public.cancel_ai_job('77777777-7777-4777-8777-777777777771') $$,
  '42501',
  'AI job cannot be cancelled by this user',
  'user cancellation cannot stop a trusted operator job'
);
select lives_ok(
  $$ select public.cancel_ai_job((select id from public.ai_jobs where origin = 'inline_ask')) $$,
  'queued Ask can be cancelled'
);
select lives_ok(
  $$ select public.cancel_ai_job((select id from public.ai_jobs where origin = 'inline_ask')) $$,
  'repeated cancellation is idempotent'
);
select is(
  (select count(*)::integer from public.audit_events where event_type = 'ai_job.cancelled'),
  1,
  'idempotent cancellation emits one audit event'
);

select lives_ok(
  $$
    select * from public.append_item_revision(
      '33333333-3333-4333-8333-333333333333',
      1,
      '44444444-4444-4444-8444-444444444441',
      '{"schemaVersion":1,"spine":{"titleLead":"Test item","situation":"Needs a safe persistence test.","recommendation":"Keep the history append-only.","stateLabel":"Needs you","sourceLabel":null,"sourceTime":null},"blocks":[],"actionIds":[],"ask":{"enabled":true}}',
      array['66666666-6666-4666-8666-666666666661'::uuid]
    )
  $$,
  'current revision appends atomically'
);
select is((select version from public.items where id = '33333333-3333-4333-8333-333333333333'), 2, 'item version advances');
select is(
  (select count(*)::integer from public.item_revisions where item_id = '33333333-3333-4333-8333-333333333333'),
  2,
  'historical revision is retained'
);
select throws_ok(
  $$
    select * from public.append_item_revision(
      '33333333-3333-4333-8333-333333333333',
      2,
      (select current_revision_id from public.items where id = '33333333-3333-4333-8333-333333333333'),
      '{"schemaVersion":1,"blocks":[]}'
    )
  $$,
  '22023',
  'invalid item document',
  'revision writes enforce the complete document envelope'
);
select throws_ok(
  $$
    select * from public.append_item_revision(
      '33333333-3333-4333-8333-333333333333',
      2,
      (select current_revision_id from public.items where id = '33333333-3333-4333-8333-333333333333'),
      '{"schemaVersion":1,"spine":{"titleLead":"Test item","situation":"Needs a safe persistence test.","recommendation":null,"stateLabel":"Needs you","sourceLabel":null,"sourceTime":null},"blocks":[],"actionIds":[],"ask":{"enabled":true}}',
      array_fill('66666666-6666-4666-8666-666666666661'::uuid, array[33])
    )
  $$,
  '22023',
  'source references must contain at most 32 IDs',
  'revision writes cap source evidence references'
);
select throws_ok(
  $$
    select * from public.append_item_revision(
      '33333333-3333-4333-8333-333333333333',
      1,
      '44444444-4444-4444-8444-444444444441',
      '{"schemaVersion":1,"spine":{"titleLead":"Test item","situation":"Needs a safe persistence test.","recommendation":null,"stateLabel":"Needs you","sourceLabel":null,"sourceTime":null},"blocks":[],"actionIds":[],"ask":{"enabled":true}}'
    )
  $$,
  '40001',
  'stale item revision',
  'stale revision write is rejected'
);
select throws_ok(
  $$
    select * from public.append_item_revision(
      '33333333-3333-4333-8333-333333333333',
      null::integer,
      null::uuid,
      '{"schemaVersion":1,"spine":{"titleLead":"Test item","situation":"Needs a safe persistence test.","recommendation":null,"stateLabel":"Needs you","sourceLabel":null,"sourceTime":null},"blocks":[],"actionIds":[],"ask":{"enabled":true}}'
    )
  $$,
  '40001',
  'stale item revision',
  'null optimistic-lock inputs cannot bypass stale detection'
);

select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
select throws_ok(
  $$ select public.queue_item_ask('33333333-3333-4333-8333-333333333333', 'Cross the workspace boundary') $$,
  '42501',
  'workspace access denied',
  'outsider cannot queue work against another workspace item'
);

reset role;
select throws_ok(
  $$ update public.item_revisions set document = '{"schemaVersion":1}' where item_id = '33333333-3333-4333-8333-333333333333' $$,
  '55000',
  'item_revisions is append-only',
  'revision history cannot be updated by a privileged application role'
);
select throws_ok(
  $$ update public.audit_events set payload = '{"changed":true}' where workspace_id = '11111111-1111-4111-8111-111111111111' $$,
  '55000',
  'audit_events is append-only',
  'audit history cannot be updated'
);
select throws_ok(
  $$ delete from public.workspace_memberships where workspace_id = '11111111-1111-4111-8111-111111111111' and role = 'owner' $$,
  '55000',
  'workspace owner membership cannot be changed or deleted',
  'owner membership cannot be removed casually'
);
select throws_ok(
  $$ update public.workspaces set owner_user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' where id = '11111111-1111-4111-8111-111111111111' $$,
  '55000',
  'workspace ownership is immutable',
  'workspace owner and owner membership cannot drift apart'
);
select throws_ok(
  $$ delete from public.source_records where id = '66666666-6666-4666-8666-666666666661' $$,
  '23503',
  'source record is referenced by item revision history',
  'revision evidence cannot be deleted while referenced'
);
select throws_ok(
  $$
    insert into public.actions (
      workspace_id,
      item_id,
      item_revision_id,
      kind,
      capability,
      label,
      recommended,
      visual_tone,
      risk_level
    ) values (
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444441',
      'internal',
      'gmail.schedule_send_draft',
      'Unsafe authority mismatch',
      false,
      'ink',
      'internal'
    )
  $$,
  '23514',
  'new row for relation "actions" violates check constraint "actions_capability_authority_check"',
  'database actions cannot understate capability authority'
);
select throws_ok(
  $$
    insert into public.item_revisions (item_id, version, document, source_ref_ids, created_by)
    values (
      '33333333-3333-4333-8333-333333333333',
      99,
      '{"schemaVersion":1,"spine":{"titleLead":"Test item","situation":"Needs a safe persistence test.","recommendation":null,"stateLabel":"Needs you","sourceLabel":null,"sourceTime":null},"blocks":[],"actionIds":[],"ask":{"enabled":true}}',
      array['66666666-6666-4666-8666-666666666662'::uuid],
      'system'
    )
  $$,
  '23514',
  'item revision source is outside the item workspace',
  'revision evidence cannot cross workspaces'
);

select * from finish();
rollback;
