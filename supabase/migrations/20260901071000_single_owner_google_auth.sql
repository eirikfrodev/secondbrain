begin;

create table private.auth_owner_identity (
  singleton boolean primary key default true check (singleton),
  provider text not null default 'google' check (provider = 'google'),
  email_normalized text not null check (
    email_normalized = lower(btrim(email_normalized))
    and char_length(email_normalized) between 3 and 320
    and position('@' in email_normalized) > 1
  ),
  bound_user_id uuid unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  bound_at timestamptz,
  constraint auth_owner_identity_binding_check check (
    (bound_user_id is null and bound_at is null)
    or (bound_user_id is not null and bound_at is not null)
  )
);

comment on table private.auth_owner_identity is
  'Out-of-band single-owner Google identity. The real email is never seeded by migrations.';

revoke all on table private.auth_owner_identity
from public, anon, authenticated, service_role, supabase_auth_admin;
grant usage on schema private to supabase_auth_admin;
grant select on table private.auth_owner_identity to supabase_auth_admin;

create function private.protect_auth_owner_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    if old.bound_user_id is not null then
      raise exception 'Bound owner identity is immutable' using errcode = '55000';
    end if;

    return old;
  end if;

  if new.singleton is distinct from old.singleton
    or new.created_at is distinct from old.created_at then
    raise exception 'Owner identity metadata is immutable' using errcode = '55000';
  end if;

  if old.bound_user_id is not null then
    if new.provider is distinct from old.provider
      or new.email_normalized is distinct from old.email_normalized
      or new.bound_user_id is distinct from old.bound_user_id
      or new.bound_at is distinct from old.bound_at then
      raise exception 'Bound owner identity is immutable' using errcode = '55000';
    end if;

    return new;
  end if;

  if new.bound_user_id is not null then
    if new.provider is distinct from old.provider
      or new.email_normalized is distinct from old.email_normalized
      or new.bound_at is null then
      raise exception 'Owner identity binding must be an atomic UUID transition'
        using errcode = '55000';
    end if;
  elsif new.bound_at is not null then
    raise exception 'Owner identity binding must be an atomic UUID transition'
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

revoke all on function private.protect_auth_owner_identity()
from public, anon, authenticated, service_role, supabase_auth_admin;

create trigger auth_owner_identity_protect_binding
before update or delete on private.auth_owner_identity
for each row execute function private.protect_auth_owner_identity();

create function private.before_user_created(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  candidate_user_id text := event #>> '{user,id}';
  candidate_email text := lower(btrim(event #>> '{user,email}'));
  candidate_provider text := event #>> '{user,app_metadata,provider}';
  candidate_is_anonymous text := event #>> '{user,is_anonymous}';
begin
  if candidate_user_id is null
    or candidate_email is null
    or candidate_provider is distinct from 'google'
    or candidate_is_anonymous is distinct from 'false'
    or not exists (
      select 1
      from private.auth_owner_identity identity
      where identity.singleton
        and identity.provider = candidate_provider
        and identity.email_normalized = candidate_email
        and (
          identity.bound_user_id is null
          or identity.bound_user_id::text = candidate_user_id
        )
    ) then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Sign-in is not available for this account.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$function$;

revoke all on function private.before_user_created(jsonb)
from public, anon, authenticated, service_role, supabase_auth_admin;
grant execute on function private.before_user_created(jsonb) to supabase_auth_admin;

create function private.bootstrap_owner_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized_email text := lower(btrim(new.email));
  configured_user_id uuid;
  created_workspace_id uuid;
  owner_workspace_id uuid;
begin
  if new.email is null
    or new.raw_app_meta_data ->> 'provider' is distinct from 'google'
    or new.is_anonymous is distinct from false then
    raise exception 'Auth identity is not authorized for this application'
      using errcode = '42501';
  end if;

  select identity.bound_user_id
  into configured_user_id
  from private.auth_owner_identity identity
  where identity.singleton
    and identity.provider = 'google'
    and identity.email_normalized = normalized_email
  for update;

  if not found
    or (configured_user_id is not null and configured_user_id is distinct from new.id) then
    raise exception 'Auth identity is not authorized for this application'
      using errcode = '42501';
  end if;

  if configured_user_id is null then
    update private.auth_owner_identity
    set bound_user_id = new.id,
        bound_at = now()
    where singleton
      and bound_user_id is null;
  end if;

  insert into public.workspaces (owner_user_id, name, kind)
  values (new.id, 'Personal', 'personal')
  on conflict (owner_user_id) where kind = 'personal' do nothing
  returning id into created_workspace_id;

  if created_workspace_id is not null then
    owner_workspace_id := created_workspace_id;
  else
    select workspace.id
    into owner_workspace_id
    from public.workspaces workspace
    where workspace.owner_user_id = new.id
      and workspace.kind = 'personal';
  end if;

  if owner_workspace_id is null
    or not exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = owner_workspace_id
        and membership.user_id = new.id
        and membership.role = 'owner'
    ) then
    raise exception 'Owner workspace bootstrap failed' using errcode = '55000';
  end if;

  insert into public.source_health (
    workspace_id,
    source_key,
    label,
    status,
    message
  ) values (
    owner_workspace_id,
    'utsikt_operator',
    'Utsikt operator',
    'not_configured',
    'Operator schedule is not configured yet.'
  )
  on conflict (workspace_id, source_key) do nothing;

  if created_workspace_id is not null then
    insert into public.audit_events (
      workspace_id,
      actor_type,
      actor_id,
      event_type,
      entity_type,
      entity_id,
      payload
    ) values (
      owner_workspace_id,
      'system',
      new.id,
      'workspace.bootstrapped',
      'workspace',
      owner_workspace_id,
      jsonb_build_object('kind', 'personal')
    );
  end if;

  return new;
end;
$function$;

revoke all on function private.bootstrap_owner_workspace()
from public, anon, authenticated, service_role, supabase_auth_admin;

create trigger auth_users_bootstrap_owner_workspace
after insert on auth.users
for each row execute function private.bootstrap_owner_workspace();

commit;
