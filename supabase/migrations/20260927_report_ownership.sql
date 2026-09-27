-- Signed-in reports belong to a Clerk account. Anonymous reports use a private receipt.
alter table public.ride_reports
  add column if not exists owner_user_id text,
  add column if not exists manage_token_hash text;

alter table public.ride_reports drop constraint if exists ride_reports_owner_or_receipt;
alter table public.ride_reports add constraint ride_reports_owner_or_receipt
  check ((owner_user_id is null) <> (manage_token_hash is null)) not valid;

create index if not exists ride_reports_owner_created_at
  on public.ride_reports (owner_user_id, created_at desc)
  where owner_user_id is not null;
create unique index if not exists ride_reports_manage_token_hash
  on public.ride_reports (manage_token_hash)
  where manage_token_hash is not null;

create table if not exists public.report_deletion_jobs (
  report_id uuid primary key,
  paths text[] not null,
  created_at timestamptz not null default now()
);
alter table public.report_deletion_jobs enable row level security;
revoke all on table public.report_deletion_jobs from anon, authenticated;
grant select, delete on table public.report_deletion_jobs to service_role;

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
  if not (
    (report_row.owner_user_id is not null and report_row.owner_user_id = p_owner_user_id)
    or (report_row.owner_user_id is null and report_row.manage_token_hash is not null
        and report_row.manage_token_hash = p_manage_token_hash)
  ) then return null; end if;

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

-- If a reviewed report is removed, a published group must not retain its old count.
create or replace function public.adjust_public_trend_after_report_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  remaining_count integer;
begin
  if old.review_status <> 'reviewed' then return old; end if;
  select count(*) into remaining_count from public.ride_reports
    where review_status = 'reviewed'
      and provider = old.provider and issue_type = old.issue_type and area = old.area;
  if remaining_count < 3 then
    delete from public.public_ride_trends
      where provider = old.provider and issue_type = old.issue_type and area = old.area;
  else
    update public.public_ride_trends
      set report_count = least(report_count, remaining_count), updated_at = now()
      where provider = old.provider and issue_type = old.issue_type and area = old.area;
  end if;
  return old;
end;
$$;

drop trigger if exists ride_reports_adjust_public_trend_after_delete on public.ride_reports;
create trigger ride_reports_adjust_public_trend_after_delete
  after delete on public.ride_reports
  for each row execute function public.adjust_public_trend_after_report_delete();
revoke all on function public.adjust_public_trend_after_report_delete() from public, anon, authenticated;
