-- Require a searchable name and contact number on new reports.
-- Keep older reports editable for review, even if they lack a name.
create or replace function public.require_driver_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.driver_name is null
     or char_length(btrim(new.driver_name)) not between 2 and 100
     or new.driver_name_key is null
     or char_length(btrim(new.driver_name_key)) = 0
     or new.driver_contact is null
     or new.driver_phone_key is null
     or char_length(new.driver_phone_key) = 0 then
    raise exception 'Driver name and contact number are required' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists ride_reports_require_driver_identity on public.ride_reports;
create trigger ride_reports_require_driver_identity
  before insert or update of driver_name, driver_name_key, driver_contact, driver_phone_key
  on public.ride_reports
  for each row execute function public.require_driver_identity();

revoke all on function public.require_driver_identity() from public, anon, authenticated;
