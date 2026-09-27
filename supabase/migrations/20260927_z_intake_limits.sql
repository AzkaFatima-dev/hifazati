create table if not exists public.intake_request_limits (
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  action text not null check (action in ('upload','report','receipt')),
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (subject_hash, action, window_start)
);
create index if not exists intake_request_limits_window on public.intake_request_limits(window_start);
alter table public.intake_request_limits enable row level security;
revoke all on public.intake_request_limits from public, anon, authenticated;

create or replace function public.reserve_intake_attempt(p_subject_hash text, p_action text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  max_attempts integer;
  reserved integer;
begin
  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  max_attempts := case p_action when 'upload' then 60 when 'report' then 20 when 'receipt' then 120 else null end;
  if max_attempts is null then return false; end if;
  delete from public.intake_request_limits where window_start < now() - interval '2 hours';
  insert into public.intake_request_limits(subject_hash,action,window_start,attempts)
    values(p_subject_hash,p_action,date_trunc('hour',now()),1)
    on conflict(subject_hash,action,window_start) do update
      set attempts = public.intake_request_limits.attempts + 1
      where public.intake_request_limits.attempts < max_attempts
    returning attempts into reserved;
  return reserved is not null;
end;
$$;
revoke all on function public.reserve_intake_attempt(text,text) from public, anon, authenticated;
grant execute on function public.reserve_intake_attempt(text,text) to service_role;

-- Enforce the same MIME allowlist even when a signed URL is used directly.
update storage.buckets set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/heic','image/heif',
  'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm',
  'video/mp4','video/webm','video/quicktime','application/pdf'
] where id='report-evidence';
