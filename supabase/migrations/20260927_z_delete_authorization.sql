-- Reject both FALSE and UNKNOWN (NULL) ownership comparisons.
-- A missing credential must never authorize deletion.
create or replace function public.delete_owned_report(
  p_report_id uuid,
  p_owner_user_id text,
  p_manage_token_hash text
)
returns text[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  report_row public.ride_reports%rowtype;
  file_paths text[];
begin
  select * into report_row from public.ride_reports
    where id = p_report_id for update;
  if not found then return null; end if;
  if (
    (report_row.owner_user_id is not null and report_row.owner_user_id = p_owner_user_id)
    or (report_row.owner_user_id is null and report_row.manage_token_hash is not null
        and report_row.manage_token_hash = p_manage_token_hash)
  ) is not true then return null; end if;

  file_paths := coalesce(report_row.evidence_paths, array[]::text[])
    || case when report_row.driver_photo_path is null then array[]::text[]
            else array[report_row.driver_photo_path] end;
  insert into public.report_deletion_jobs (report_id, paths)
    values (p_report_id, file_paths)
    on conflict (report_id) do update set paths = excluded.paths;
  delete from public.ride_reports where id = p_report_id;
  return file_paths;
end;
$$;
revoke all on function public.delete_owned_report(uuid, text, text) from public, anon, authenticated;
grant execute on function public.delete_owned_report(uuid, text, text) to service_role;
