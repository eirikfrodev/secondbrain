begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(27);

select is(
  private.before_user_created(
    '{"metadata":{"name":"before-user-created"},"user":{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"owner@example.test","app_metadata":{"provider":"google"},"is_anonymous":false}}'::jsonb
  ),
  '{"error":{"http_code":403,"message":"Sign-in is not available for this account."}}'::jsonb,
  'an empty owner identity fails closed'
);

insert into private.auth_owner_identity (email_normalized)
values ('owner@example.test');

select lives_ok(
  $$ update private.auth_owner_identity
     set email_normalized = 'corrected@example.test'
     where singleton $$,
  'the unbound owner email can be corrected out of band'
);
update private.auth_owner_identity
set email_normalized = 'owner@example.test'
where singleton;

select is(
  private.before_user_created(
    '{"metadata":{"name":"before-user-created"},"user":{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"OWNER@example.test","app_metadata":{"provider":"google"},"is_anonymous":false}}'::jsonb
  ),
  '{}'::jsonb,
  'the exact Google owner identity is allowed case-insensitively'
);
select is(
  private.before_user_created(
    '{"metadata":{"name":"before-user-created"},"user":{"id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"outsider@example.test","app_metadata":{"provider":"google"},"is_anonymous":false}}'::jsonb
  ),
  '{"error":{"http_code":403,"message":"Sign-in is not available for this account."}}'::jsonb,
  'a different Google email is rejected'
);
select is(
  private.before_user_created(
    '{"metadata":{"name":"before-user-created"},"user":{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"owner@example.test","app_metadata":{"provider":"email"},"is_anonymous":false}}'::jsonb
  ),
  '{"error":{"http_code":403,"message":"Sign-in is not available for this account."}}'::jsonb,
  'the allowlisted email cannot use a non-Google provider'
);
select is(
  private.before_user_created(
    '{"metadata":{"name":"before-user-created"},"user":{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","app_metadata":{"provider":"google"},"is_anonymous":false}}'::jsonb
  ),
  '{"error":{"http_code":403,"message":"Sign-in is not available for this account."}}'::jsonb,
  'a malformed identity fails closed'
);
select is(
  private.before_user_created(
    '{"metadata":{"name":"before-user-created"},"user":{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"owner@example.test","app_metadata":{"provider":"google"},"is_anonymous":true}}'::jsonb
  ),
  '{"error":{"http_code":403,"message":"Sign-in is not available for this account."}}'::jsonb,
  'an anonymous identity cannot claim the owner account'
);

select throws_ok(
  $$
    insert into auth.users (id, email, raw_app_meta_data, is_anonymous)
    values (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'owner@example.test',
      '{"provider":"google","providers":["google"]}'::jsonb,
      true
    )
  $$,
  '42501',
  'Auth identity is not authorized for this application',
  'the Auth trigger independently rejects anonymous owner creation'
);
select is(
  (select count(*)::integer from auth.users where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  0,
  'the rejected anonymous insert leaves no user behind'
);

insert into auth.users (id, email, raw_app_meta_data, is_anonymous)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'owner@example.test',
  '{"provider":"google","providers":["google"]}'::jsonb,
  false
);

select is(
  (select bound_user_id from private.auth_owner_identity where singleton),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'the owner identity binds to the immutable Supabase user ID'
);
select throws_ok(
  $$
    insert into auth.users (id, email, raw_app_meta_data, is_anonymous)
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'owner@example.test',
      '{"provider":"google","providers":["google"]}'::jsonb,
      false
    )
  $$,
  '42501',
  'Auth identity is not authorized for this application',
  'the Auth trigger rejects a second UUID for the bound owner email'
);
select is(
  (
    select count(*)::integer
    from auth.users
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ),
  0,
  'the rejected second owner UUID leaves no user behind'
);
select is(
  (
    select count(*)::integer
    from public.workspaces
    where owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and kind = 'personal'
      and name = 'Personal'
  ),
  1,
  'Auth creation atomically creates one personal workspace'
);
select is(
  (
    select count(*)::integer
    from public.workspace_memberships membership
    join public.workspaces workspace on workspace.id = membership.workspace_id
    where workspace.owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and membership.user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and membership.role = 'owner'
  ),
  1,
  'the existing workspace trigger creates the owner membership'
);
select is(
  (
    select count(*)::integer
    from public.source_health health
    join public.workspaces workspace on workspace.id = health.workspace_id
    where workspace.owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and health.source_key = 'utsikt_operator'
      and health.status = 'not_configured'
  ),
  1,
  'bootstrap records explicit unconfigured operator health'
);
select is(
  (
    select count(*)::integer
    from public.audit_events event
    join public.workspaces workspace on workspace.id = event.workspace_id
    where workspace.owner_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and event.event_type = 'workspace.bootstrapped'
      and event.actor_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  1,
  'bootstrap emits one non-PII audit event'
);

select is(
  private.before_user_created(
    '{"metadata":{"name":"before-user-created"},"user":{"id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","email":"owner@example.test","app_metadata":{"provider":"google"},"is_anonymous":false}}'::jsonb
  ),
  '{"error":{"http_code":403,"message":"Sign-in is not available for this account."}}'::jsonb,
  'the bound email cannot claim a second Supabase user ID'
);

select throws_ok(
  $$
    insert into auth.users (id, email, raw_app_meta_data, is_anonymous)
    values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'outsider@example.test',
      '{"provider":"google","providers":["google"]}'::jsonb,
      false
    )
  $$,
  '42501',
  'Auth identity is not authorized for this application',
  'the Auth trigger fails closed even if the signup hook is bypassed'
);
select is(
  (
    select count(*)::integer
    from auth.users
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ),
  0,
  'a rejected Auth insert leaves no user behind'
);

select throws_ok(
  $$ update private.auth_owner_identity
     set email_normalized = 'changed@example.test'
     where singleton $$,
  '55000',
  'Bound owner identity is immutable',
  'the bound owner email cannot be changed'
);
select throws_ok(
  $$ update private.auth_owner_identity
     set bound_user_id = null,
         bound_at = null
     where singleton $$,
  '55000',
  'Bound owner identity is immutable',
  'the Supabase user binding cannot be cleared'
);
select throws_ok(
  $$ delete from private.auth_owner_identity where singleton $$,
  '55000',
  'Bound owner identity is immutable',
  'the bound owner identity cannot be deleted'
);

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select is(
  (select count(*)::integer from public.workspaces),
  1,
  'the bound owner sees the provisioned workspace through RLS'
);
select throws_ok(
  $$ insert into public.workspaces (owner_user_id, name, kind)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Another', 'work') $$,
  '42501',
  'permission denied for table workspaces',
  'the authenticated owner cannot create arbitrary workspaces directly'
);
select throws_ok(
  $$ select * from private.auth_owner_identity $$,
  '42501',
  'permission denied for table auth_owner_identity',
  'the authenticated owner cannot read the private allowlist'
);
reset role;

select ok(
  has_table_privilege('supabase_auth_admin', 'private.auth_owner_identity', 'select'),
  'Supabase Auth can read the private owner identity'
);
select ok(
  has_function_privilege(
    'supabase_auth_admin',
    'private.before_user_created(jsonb)',
    'execute'
  ),
  'Supabase Auth can execute only the signup hook'
);

select * from finish();
rollback;
