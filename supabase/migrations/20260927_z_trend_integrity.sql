-- A public trend must reflect at least three actual reviewed reports.
create or replace function public.validate_public_trend()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  reviewed_count integer;
begin
  select count(*) into reviewed_count from public.ride_reports
    where review_status = 'reviewed'
      and provider = new.provider and issue_type = new.issue_type and area = new.area;
  if reviewed_count < 3 or new.report_count > reviewed_count then
    raise exception 'A public trend needs at least three matching reviewed reports and an accurate count'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists public_ride_trends_validate on public.public_ride_trends;
create trigger public_ride_trends_validate
  before insert or update of provider, issue_type, area, report_count on public.public_ride_trends
  for each row execute function public.validate_public_trend();
revoke all on function public.validate_public_trend() from public, anon, authenticated;

-- Deleting or downgrading a reviewed report must remove stale public counts.
create or replace function public.adjust_public_trend_after_report_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  remaining_count integer;
begin
  if old.review_status <> 'reviewed' then return null; end if;
  if tg_op = 'UPDATE' then
    if new.review_status = 'reviewed'
       and new.provider = old.provider and new.issue_type = old.issue_type and new.area = old.area then
      return null;
    end if;
  end if;
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
  return null;
end;
$$;
drop trigger if exists ride_reports_adjust_public_trend_after_delete on public.ride_reports;
drop trigger if exists ride_reports_adjust_public_trend_after_update on public.ride_reports;
create trigger ride_reports_adjust_public_trend_after_delete
  after delete on public.ride_reports
  for each row execute function public.adjust_public_trend_after_report_change();
create trigger ride_reports_adjust_public_trend_after_update
  after update of review_status, provider, issue_type, area on public.ride_reports
  for each row execute function public.adjust_public_trend_after_report_change();
revoke all on function public.adjust_public_trend_after_report_change() from public, anon, authenticated;
