-- Private identifiers for exact-match lookup of reviewed reports only.
alter table public.ride_reports
  add column if not exists driver_name text,
  add column if not exists driver_name_key text,
  add column if not exists driver_phone_key text,
  add column if not exists driver_photo_sha256 text;

update public.ride_reports
set driver_phone_key = case
  when left(regexp_replace(driver_contact, '[^0-9]', '', 'g'), 4) = '0092'
    and char_length(regexp_replace(driver_contact, '[^0-9]', '', 'g')) = 14
    then substring(regexp_replace(driver_contact, '[^0-9]', '', 'g') from 3)
  when left(regexp_replace(driver_contact, '[^0-9]', '', 'g'), 1) = '0'
    and char_length(regexp_replace(driver_contact, '[^0-9]', '', 'g')) = 11
    then '92' || substring(regexp_replace(driver_contact, '[^0-9]', '', 'g') from 2)
  else regexp_replace(driver_contact, '[^0-9]', '', 'g')
end
where driver_contact is not null and driver_phone_key is null;

update public.ride_reports
set driver_name_key = lower(regexp_replace(btrim(driver_name), '\s+', ' ', 'g'))
where driver_name is not null and driver_name_key is null;

create index if not exists ride_reports_reviewed_phone_lookup
  on public.ride_reports (driver_phone_key)
  where review_status = 'reviewed' and driver_phone_key is not null;
create index if not exists ride_reports_reviewed_name_lookup
  on public.ride_reports (driver_name_key)
  where review_status = 'reviewed' and driver_name_key is not null;
create index if not exists ride_reports_reviewed_photo_lookup
  on public.ride_reports (driver_photo_sha256)
  where review_status = 'reviewed' and driver_photo_sha256 is not null;

create table if not exists public.driver_lookup_attempts (
  id bigint generated always as identity primary key,
  clerk_user_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists driver_lookup_attempts_user_time
  on public.driver_lookup_attempts (clerk_user_id, created_at desc);
alter table public.driver_lookup_attempts enable row level security;
revoke all on table public.driver_lookup_attempts from anon, authenticated;

create or replace function public.reserve_driver_lookup(p_user_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_user_id !~ '^user_[A-Za-z0-9]{8,64}$' then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id));
  if (select count(*) from public.driver_lookup_attempts
      where clerk_user_id = p_user_id and created_at > now() - interval '24 hours') >= 20 then
    return false;
  end if;
  insert into public.driver_lookup_attempts (clerk_user_id) values (p_user_id);
  return true;
end;
$$;
revoke all on function public.reserve_driver_lookup(text) from public, anon, authenticated;
grant execute on function public.reserve_driver_lookup(text) to service_role;
