begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create extension if not exists pg_jsonschema with schema extensions;

create function private.is_valid_item_document_v1(candidate jsonb)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $function$
  select candidate is not null
    and extensions.jsonb_matches_schema(
      $schema$
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "additionalProperties": false,
        "required": ["schemaVersion", "spine", "blocks", "actionIds", "ask"],
        "properties": {
          "schemaVersion": { "const": 1 },
          "spine": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "titleLead",
              "situation",
              "recommendation",
              "stateLabel",
              "sourceLabel",
              "sourceTime"
            ],
            "properties": {
              "titleLead": { "type": "string", "minLength": 1, "maxLength": 100 },
              "situation": { "type": "string", "minLength": 1, "maxLength": 320 },
              "recommendation": { "type": ["string", "null"], "maxLength": 500 },
              "stateLabel": { "type": "string", "minLength": 1, "maxLength": 50 },
              "sourceLabel": { "type": ["string", "null"], "maxLength": 100 },
              "sourceTime": { "type": ["string", "null"], "maxLength": 100 },
              "provenance": {
                "type": "object",
                "additionalProperties": false,
                "required": ["kind", "label"],
                "properties": {
                  "kind": {
                    "enum": [
                      "email",
                      "calendar",
                      "message",
                      "chat",
                      "user_request",
                      "operator",
                      "project",
                      "manual"
                    ]
                  },
                  "label": { "type": "string", "maxLength": 220 },
                  "quote": { "type": "string", "maxLength": 700 },
                  "sourcesRead": { "type": "integer", "minimum": 0 },
                  "confidence": { "enum": ["explicit", "strong", "inferred"] }
                }
              }
            }
          },
          "blocks": {
            "type": "array",
            "maxItems": 12,
            "items": {}
          },
          "actionIds": {
            "type": "array",
            "maxItems": 4,
            "items": {
              "type": "string",
              "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
            }
          },
          "ask": {
            "type": "object",
            "additionalProperties": false,
            "required": ["enabled"],
            "properties": {
              "enabled": { "const": true },
              "placeholder": { "type": "string", "maxLength": 160 }
            }
          }
        }
      }
      $schema$::json,
      candidate
    );
$function$;

revoke all on function private.is_valid_item_document_v1(jsonb) from public, anon, authenticated;
grant execute on function private.is_valid_item_document_v1(jsonb) to authenticated;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null check (kind in ('personal', 'work')),
  timezone text not null default 'Europe/Oslo' check (char_length(timezone) between 1 and 100),
  locale text not null default 'nb-NO' check (char_length(locale) between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index workspaces_one_personal_per_owner_idx
  on public.workspaces (owner_user_id)
  where kind = 'personal';

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.source_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  provider text not null check (provider in ('google', 'microsoft', 'messages', 'chatgpt', 'manual', 'project')),
  source_type text not null check (source_type in ('email', 'calendar', 'message', 'chat', 'manual', 'project')),
  account_identifier text,
  external_id text,
  external_thread_id text,
  internet_message_id text,
  resolution text not null check (resolution in ('exact', 'search_hint', 'unresolved')),
  title text not null check (char_length(title) between 1 and 300),
  sender text,
  occurred_at timestamptz,
  deep_link text,
  snippet text check (snippet is null or char_length(snippet) <= 1000),
  content_hash text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  stable_key text not null check (char_length(stable_key) between 1 and 300),
  name text not null check (char_length(name) between 1 and 160),
  status text not null check (status in ('active', 'waiting', 'decided', 'dropped', 'completed')),
  summary text not null default '' check (char_length(summary) <= 2000),
  review_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, stable_key),
  unique (workspace_id, id)
);

create table public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  source_type text not null check (source_type in ('email', 'calendar', 'message', 'chat', 'user_request', 'operator', 'project', 'manual')),
  source_ref_id uuid references public.source_records(id) on delete restrict,
  summary text not null check (char_length(summary) between 1 and 2000),
  confidence text not null check (confidence in ('explicit', 'strong', 'inferred')),
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  stable_key text not null check (char_length(stable_key) between 1 and 300),
  version integer not null check (version > 0),
  state text not null check (state in ('needs_you', 'draft_ready', 'queued', 'working', 'waiting', 'done', 'stuck', 'archived')),
  tier text not null check (tier in ('needs_you', 'in_motion', 'waiting', 'handled')),
  priority smallint not null check (priority between 0 and 100),
  attention_rank integer not null,
  title_lead text not null check (char_length(title_lead) between 1 and 100),
  situation text not null check (char_length(situation) between 1 and 320),
  recommendation text check (recommendation is null or char_length(recommendation) <= 500),
  requires_user_attention boolean not null,
  due_at timestamptz,
  review_at timestamptz,
  waiting_since timestamptz,
  project_id uuid,
  current_revision_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, stable_key),
  unique (workspace_id, id),
  constraint items_project_workspace_fk
    foreign key (workspace_id, project_id)
    references public.projects (workspace_id, id)
    on delete restrict
);

create table public.item_revisions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete restrict,
  version integer not null check (version > 0),
  document jsonb not null check (private.is_valid_item_document_v1(document)),
  source_ref_ids uuid[] not null default '{}'::uuid[] check (cardinality(source_ref_ids) <= 32),
  operator_run_id uuid,
  created_by text not null check (created_by in ('user', 'operator', 'system')),
  created_at timestamptz not null default now(),
  unique (item_id, version),
  unique (item_id, id),
  unique (item_id, id, version)
);

create table private.item_revision_sources (
  item_revision_id uuid not null references public.item_revisions(id) on delete restrict,
  source_record_id uuid not null references public.source_records(id) on delete restrict,
  primary key (item_revision_id, source_record_id)
);

revoke all on table private.item_revision_sources from public, anon, authenticated;
create index item_revision_sources_source_idx
  on private.item_revision_sources (source_record_id);

alter table public.items
  add constraint items_current_revision_fk
  foreign key (id, current_revision_id, version)
  references public.item_revisions (item_id, id, version)
  on delete restrict
  deferrable initially deferred;

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  item_id uuid not null,
  item_revision_id uuid not null,
  kind text not null check (kind in ('internal', 'ai', 'external', 'hybrid')),
  capability text not null check (capability in (
    'item.complete',
    'item.reopen',
    'item.snooze',
    'item.dismiss',
    'item.archive',
    'project.reassess',
    'project.drop',
    'ai.enqueue',
    'gmail.ensure_reply_draft',
    'gmail.update_reply_draft',
    'gmail.schedule_send_draft',
    'gmail.cancel_scheduled_send',
    'calendar.create_event',
    'calendar.create_private_hold',
    'calendar.delete_event',
    'workflow.reply_and_calendar',
    'url.open'
  )),
  label text not null check (char_length(label) between 1 and 100),
  recommended boolean not null default false,
  visual_tone text not null check (visual_tone in ('ink', 'fjord', 'outline', 'link')),
  consequence text check (consequence is null or char_length(consequence) <= 300),
  effect_plan jsonb not null default '{}'::jsonb check (jsonb_typeof(effect_plan) = 'object'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  risk_level text not null check (risk_level in ('internal', 'external_reversible', 'external_irreversible', 'prohibited')),
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'prepared', 'scheduled', 'executing', 'succeeded', 'failed', 'cancelled', 'expired')),
  allow_stale_execution boolean not null default false,
  execute_after timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actions_capability_authority_check check (
    (capability in (
      'item.complete', 'item.reopen', 'item.snooze', 'item.dismiss', 'item.archive', 'project.drop'
    ) and kind = 'internal' and risk_level = 'internal')
    or (capability in ('project.reassess', 'ai.enqueue') and kind = 'ai' and risk_level = 'internal')
    or (capability in (
      'gmail.ensure_reply_draft',
      'gmail.update_reply_draft',
      'gmail.cancel_scheduled_send',
      'calendar.create_private_hold',
      'calendar.delete_event'
    ) and kind = 'external' and risk_level = 'external_reversible')
    or (capability in (
      'gmail.schedule_send_draft', 'calendar.create_event'
    ) and kind = 'external' and risk_level = 'external_irreversible')
    or (capability = 'workflow.reply_and_calendar' and kind = 'hybrid' and risk_level = 'external_irreversible')
    or (capability = 'url.open' and kind = 'external' and risk_level = 'internal')
  ),
  constraint actions_item_workspace_fk
    foreign key (workspace_id, item_id)
    references public.items (workspace_id, id)
    on delete restrict,
  constraint actions_revision_item_fk
    foreign key (item_id, item_revision_id)
    references public.item_revisions (item_id, id)
    on delete restrict
);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  item_id uuid,
  requested_by_user_id uuid references auth.users(id) on delete restrict,
  instruction text not null check (char_length(btrim(instruction)) between 1 and 2000),
  origin text not null check (origin in ('inline_ask', 'global_ask', 'operator', 'capture', 'system')),
  priority smallint not null default 50 check (priority between 0 and 100),
  status text not null default 'queued' check (status in ('queued', 'working', 'completed', 'stuck', 'cancelled')),
  queued_for timestamptz not null,
  result_summary text check (result_summary is null or char_length(result_summary) <= 2000),
  result_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(result_payload) = 'object'),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint ai_jobs_user_ask_requester_check
    check (origin not in ('inline_ask', 'global_ask') or requested_by_user_id is not null),
  constraint ai_jobs_item_workspace_fk
    foreign key (workspace_id, item_id)
    references public.items (workspace_id, id)
    on delete restrict
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  actor_type text not null check (actor_type in ('user', 'chatgpt', 'worker', 'system')),
  actor_id uuid,
  event_type text not null check (char_length(event_type) between 1 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create table public.source_health (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  source_key text not null check (char_length(source_key) between 1 and 120),
  label text not null check (char_length(label) between 1 and 160),
  status text not null check (status in ('healthy', 'disconnected', 'permission_expired', 'sync_delayed', 'partial_sync', 'unavailable', 'stale', 'offline', 'error', 'not_configured')),
  message text check (message is null or char_length(message) <= 500),
  last_success_at timestamptz,
  last_checked_at timestamptz not null default now(),
  next_expected_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_key)
);

create index items_workspace_tier_rank_idx on public.items (workspace_id, tier, attention_rank);
create index items_workspace_due_idx on public.items (workspace_id, due_at);
create index items_workspace_review_idx on public.items (workspace_id, review_at);
create index actions_workspace_item_idx on public.actions (workspace_id, item_id, status);
create unique index actions_one_recommended_per_revision_idx
  on public.actions (item_revision_id)
  where recommended;
create index ai_jobs_workspace_status_queue_idx on public.ai_jobs (workspace_id, status, queued_for);
create index item_revisions_source_ref_ids_idx on public.item_revisions using gin (source_ref_ids);
create index source_records_thread_idx on public.source_records (workspace_id, provider, external_thread_id);
create index projects_workspace_status_review_idx on public.projects (workspace_id, status, review_at);
create index audit_events_workspace_created_idx on public.audit_events (workspace_id, created_at desc);
create index source_health_workspace_status_idx on public.source_health (workspace_id, status);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.reject_immutable_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

create function private.validate_project_note_source_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_workspace_id uuid;
  source_workspace_id uuid;
begin
  if new.source_ref_id is null then
    return new;
  end if;

  select project.workspace_id into project_workspace_id
  from public.projects project where project.id = new.project_id;
  select source.workspace_id into source_workspace_id
  from public.source_records source where source.id = new.source_ref_id;

  if project_workspace_id is distinct from source_workspace_id then
    raise exception 'project note source is outside the project workspace' using errcode = '23514';
  end if;

  return new;
end;
$$;

create function private.validate_item_revision_source_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_workspace_id uuid;
begin
  select item.workspace_id into item_workspace_id
  from public.items item where item.id = new.item_id;

  if exists (
    select 1
    from unnest(new.source_ref_ids) source_id
    where not exists (
      select 1 from public.source_records source
      where source.id = source_id and source.workspace_id = item_workspace_id
    )
  ) then
    raise exception 'item revision source is outside the item workspace' using errcode = '23514';
  end if;

  return new;
end;
$$;

create function private.record_item_revision_sources()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.item_revision_sources (item_revision_id, source_record_id)
  select new.id, source_id
  from unnest(new.source_ref_ids) source_id
  on conflict do nothing;

  return new;
end;
$$;

create function private.ensure_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner');
  return new;
end;
$$;

create function private.prevent_workspace_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'workspace ownership is immutable' using errcode = '55000';
end;
$$;

create function private.protect_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' then
    raise exception 'workspace owner membership cannot be changed or deleted' using errcode = '55000';
  end if;
  return old;
end;
$$;

create function private.protect_revision_source_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from private.item_revision_sources revision_source
    where revision_source.source_record_id = old.id
  ) then
    raise exception 'source record is referenced by item revision history' using errcode = '23503';
  end if;

  return old;
end;
$$;

create function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.workspace_memberships membership
      where membership.workspace_id = target_workspace_id
        and membership.user_id = (select auth.uid())
    );
$$;

create function private.is_item_member(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.items item
    where item.id = target_item_id
      and private.is_workspace_member(item.workspace_id)
  );
$$;

create function private.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = target_project_id
      and private.is_workspace_member(project.workspace_id)
  );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.reject_immutable_history() from public, anon, authenticated;
revoke all on function private.validate_project_note_source_workspace() from public, anon, authenticated;
revoke all on function private.validate_item_revision_source_workspace() from public, anon, authenticated;
revoke all on function private.record_item_revision_sources() from public, anon, authenticated;
revoke all on function private.ensure_owner_membership() from public, anon, authenticated;
revoke all on function private.prevent_workspace_owner_change() from public, anon, authenticated;
revoke all on function private.protect_owner_membership() from public, anon, authenticated;
revoke all on function private.protect_revision_source_delete() from public, anon, authenticated;
revoke all on function private.is_workspace_member(uuid) from public, anon, authenticated;
revoke all on function private.is_item_member(uuid) from public, anon, authenticated;
revoke all on function private.is_project_member(uuid) from public, anon, authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_item_member(uuid) to authenticated;
grant execute on function private.is_project_member(uuid) to authenticated;

create trigger workspaces_owner_membership
after insert on public.workspaces
for each row execute function private.ensure_owner_membership();

create trigger workspaces_prevent_owner_change
before update on public.workspaces
for each row when (old.owner_user_id is distinct from new.owner_user_id)
execute function private.prevent_workspace_owner_change();

create trigger workspace_memberships_protect_owner_update
before update on public.workspace_memberships
for each row when (old.role = 'owner') execute function private.protect_owner_membership();

create trigger workspace_memberships_protect_owner_delete
before delete on public.workspace_memberships
for each row when (old.role = 'owner') execute function private.protect_owner_membership();

create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function private.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function private.set_updated_at();
create trigger items_set_updated_at before update on public.items
for each row execute function private.set_updated_at();
create trigger actions_set_updated_at before update on public.actions
for each row execute function private.set_updated_at();
create trigger source_health_set_updated_at before update on public.source_health
for each row execute function private.set_updated_at();

create trigger item_revisions_are_append_only
before update or delete on public.item_revisions
for each row execute function private.reject_immutable_history();
create trigger audit_events_are_append_only
before update or delete on public.audit_events
for each row execute function private.reject_immutable_history();

create trigger project_notes_validate_source_workspace
before insert or update on public.project_notes
for each row execute function private.validate_project_note_source_workspace();

create trigger item_revisions_validate_source_workspace
before insert on public.item_revisions
for each row execute function private.validate_item_revision_source_workspace();

create trigger item_revisions_record_sources
after insert on public.item_revisions
for each row execute function private.record_item_revision_sources();

create trigger source_records_protect_revision_evidence
before delete on public.source_records
for each row execute function private.protect_revision_source_delete();

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.source_records enable row level security;
alter table public.projects enable row level security;
alter table public.project_notes enable row level security;
alter table public.items enable row level security;
alter table public.item_revisions enable row level security;
alter table public.actions enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.audit_events enable row level security;
alter table public.source_health enable row level security;

revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_memberships from anon, authenticated;
revoke all on table public.source_records from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.project_notes from anon, authenticated;
revoke all on table public.items from anon, authenticated;
revoke all on table public.item_revisions from anon, authenticated;
revoke all on table public.actions from anon, authenticated;
revoke all on table public.ai_jobs from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;
revoke all on table public.source_health from anon, authenticated;

grant select on table public.workspaces to authenticated;
grant select on table public.workspace_memberships to authenticated;
grant select on table public.source_records to authenticated;
grant select on table public.projects to authenticated;
grant select on table public.project_notes to authenticated;
grant select on table public.items to authenticated;
grant select on table public.item_revisions to authenticated;
grant select on table public.actions to authenticated;
grant select on table public.ai_jobs to authenticated;
grant select on table public.audit_events to authenticated;
grant select on table public.source_health to authenticated;

create policy workspaces_select_member on public.workspaces
for select to authenticated
using (private.is_workspace_member(id));

create policy workspace_memberships_select_self on public.workspace_memberships
for select to authenticated
using (user_id = (select auth.uid()));

create policy source_records_select_member on public.source_records
for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy projects_select_member on public.projects
for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy project_notes_select_member on public.project_notes
for select to authenticated
using (private.is_project_member(project_id));

create policy items_select_member on public.items
for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy item_revisions_select_member on public.item_revisions
for select to authenticated
using (private.is_item_member(item_id));

create policy actions_select_member on public.actions
for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy ai_jobs_select_member on public.ai_jobs
for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy audit_events_select_member on public.audit_events
for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy source_health_select_member on public.source_health
for select to authenticated
using (private.is_workspace_member(workspace_id));

create function public.append_item_revision(
  target_item_id uuid,
  expected_version integer,
  expected_revision_id uuid,
  next_document jsonb,
  source_ref_ids uuid[] default '{}'::uuid[]
)
returns table (revision_id uuid, new_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_workspace_id uuid;
  current_version integer;
  current_revision_id uuid;
  created_revision_id uuid := gen_random_uuid();
begin
  select item.workspace_id, item.version, item.current_revision_id
  into item_workspace_id, current_version, current_revision_id
  from public.items item
  where item.id = target_item_id
  for update;

  if not found then
    raise exception 'item not found' using errcode = 'P0002';
  end if;

  if not private.is_workspace_member(item_workspace_id) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;

  if current_version is distinct from expected_version
    or current_revision_id is distinct from expected_revision_id then
    raise exception 'stale item revision' using errcode = '40001';
  end if;

  if not private.is_valid_item_document_v1(next_document) then
    raise exception 'invalid item document' using errcode = '22023';
  end if;

  if source_ref_ids is null or cardinality(source_ref_ids) > 32 then
    raise exception 'source references must contain at most 32 IDs' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(source_ref_ids) source_id
    where not exists (
      select 1 from public.source_records source
      where source.id = source_id and source.workspace_id = item_workspace_id
    )
  ) then
    raise exception 'source reference is outside the item workspace' using errcode = '23503';
  end if;

  insert into public.item_revisions (id, item_id, version, document, source_ref_ids, created_by)
  values (created_revision_id, target_item_id, current_version + 1, next_document, source_ref_ids, 'user');

  update public.items
  set version = current_version + 1,
      current_revision_id = created_revision_id
  where id = target_item_id;

  insert into public.audit_events (
    workspace_id, actor_type, actor_id, event_type, entity_type, entity_id, payload
  ) values (
    item_workspace_id,
    'user',
    (select auth.uid()),
    'item.revision_appended',
    'item',
    target_item_id,
    jsonb_build_object('previousVersion', current_version, 'newVersion', current_version + 1)
  );

  return query select created_revision_id, current_version + 1;
end;
$$;

create function private.next_operator_sync(target_workspace_id uuid)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  next_sync_at timestamptz;
begin
  select health.next_expected_at
  into next_sync_at
  from public.source_health health
  where health.workspace_id = target_workspace_id
    and health.source_key = 'utsikt_operator'
    and health.next_expected_at > now();

  if next_sync_at is null then
    raise exception 'no future operator sync is configured for this workspace' using errcode = '55000';
  end if;

  return next_sync_at;
end;
$$;

create function private.insert_user_ai_job(
  target_workspace_id uuid,
  target_item_id uuid,
  job_instruction text,
  job_origin text
)
returns public.ai_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_job public.ai_jobs;
  next_sync_at timestamptz;
begin
  if char_length(btrim(job_instruction)) not between 1 and 2000 then
    raise exception 'instruction must contain 1 to 2000 characters' using errcode = '22023';
  end if;

  if job_origin not in ('inline_ask', 'global_ask') then
    raise exception 'invalid user Ask origin' using errcode = '22023';
  end if;

  next_sync_at := private.next_operator_sync(target_workspace_id);

  insert into public.ai_jobs (
    workspace_id, item_id, requested_by_user_id, instruction, origin, priority, status, queued_for
  ) values (
    target_workspace_id,
    target_item_id,
    (select auth.uid()),
    btrim(job_instruction),
    job_origin,
    50,
    'queued',
    next_sync_at
  ) returning * into created_job;

  insert into public.audit_events (
    workspace_id, actor_type, actor_id, event_type, entity_type, entity_id, payload
  ) values (
    target_workspace_id,
    'user',
    (select auth.uid()),
    'ai_job.queued',
    'ai_job',
    created_job.id,
    jsonb_build_object('origin', job_origin, 'queuedFor', next_sync_at)
  );

  return created_job;
end;
$$;

create function public.queue_item_ask(target_item_id uuid, job_instruction text)
returns public.ai_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_workspace_id uuid;
begin
  select item.workspace_id into target_workspace_id
  from public.items item
  where item.id = target_item_id;

  if target_workspace_id is null then
    raise exception 'item not found' using errcode = 'P0002';
  end if;

  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;

  return private.insert_user_ai_job(target_workspace_id, target_item_id, job_instruction, 'inline_ask');
end;
$$;

create function public.queue_global_ask(target_workspace_id uuid, job_instruction text)
returns public.ai_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;

  return private.insert_user_ai_job(target_workspace_id, null, job_instruction, 'global_ask');
end;
$$;

create function public.cancel_ai_job(target_job_id uuid)
returns public.ai_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job public.ai_jobs;
begin
  select * into current_job
  from public.ai_jobs job
  where job.id = target_job_id
  for update;

  if not found then
    raise exception 'AI job not found' using errcode = 'P0002';
  end if;

  if not private.is_workspace_member(current_job.workspace_id) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;

  if current_job.origin not in ('inline_ask', 'global_ask')
    or current_job.requested_by_user_id is distinct from (select auth.uid()) then
    raise exception 'AI job cannot be cancelled by this user' using errcode = '42501';
  end if;

  if current_job.status = 'cancelled' then
    return current_job;
  end if;

  if current_job.status <> 'queued' then
    raise exception 'only queued AI jobs can be cancelled' using errcode = '55000';
  end if;

  update public.ai_jobs
  set status = 'cancelled', completed_at = now()
  where id = target_job_id
  returning * into current_job;

  insert into public.audit_events (
    workspace_id, actor_type, actor_id, event_type, entity_type, entity_id, payload
  ) values (
    current_job.workspace_id,
    'user',
    (select auth.uid()),
    'ai_job.cancelled',
    'ai_job',
    current_job.id,
    '{}'::jsonb
  );

  return current_job;
end;
$$;

revoke all on function private.next_operator_sync(uuid) from public, anon, authenticated;
revoke all on function private.insert_user_ai_job(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.append_item_revision(uuid, integer, uuid, jsonb, uuid[]) from public, anon, authenticated;
revoke all on function public.queue_item_ask(uuid, text) from public, anon, authenticated;
revoke all on function public.queue_global_ask(uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_ai_job(uuid) from public, anon, authenticated;
grant execute on function public.append_item_revision(uuid, integer, uuid, jsonb, uuid[]) to authenticated;
grant execute on function public.queue_item_ask(uuid, text) to authenticated;
grant execute on function public.queue_global_ask(uuid, text) to authenticated;
grant execute on function public.cancel_ai_job(uuid) to authenticated;

do $$
declare
  realtime_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach realtime_table in array array['items', 'item_revisions', 'actions', 'ai_jobs', 'source_health']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = realtime_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', realtime_table);
      end if;
    end loop;
  end if;
end;
$$;

commit;
