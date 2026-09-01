begin;

create function public.queue_item_ask(
  target_workspace_id uuid,
  target_item_id uuid,
  job_instruction text
)
returns public.ai_jobs
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;

  perform 1
  from public.items item
  where item.id = target_item_id
    and item.workspace_id = target_workspace_id;

  if not found then
    raise exception 'item not found' using errcode = 'P0002';
  end if;

  return private.insert_user_ai_job(
    target_workspace_id,
    target_item_id,
    job_instruction,
    'inline_ask'
  );
end;
$function$;

create function public.cancel_ai_job(
  target_workspace_id uuid,
  target_job_id uuid
)
returns public.ai_jobs
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_job public.ai_jobs;
begin
  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'workspace access denied' using errcode = '42501';
  end if;

  select * into current_job
  from public.ai_jobs job
  where job.id = target_job_id
    and job.workspace_id = target_workspace_id
  for update;

  if not found then
    raise exception 'AI job not found' using errcode = 'P0002';
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
    and workspace_id = target_workspace_id
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
$function$;

revoke all on function public.queue_item_ask(uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.cancel_ai_job(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.queue_item_ask(uuid, uuid, text) to authenticated;
grant execute on function public.cancel_ai_job(uuid, uuid) to authenticated;

revoke all on function public.queue_item_ask(uuid, text)
from public, anon, authenticated;
revoke all on function public.cancel_ai_job(uuid)
from public, anon, authenticated;
drop function public.queue_item_ask(uuid, text);
drop function public.cancel_ai_job(uuid);

commit;
