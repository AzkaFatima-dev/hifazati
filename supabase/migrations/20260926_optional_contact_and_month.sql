-- A report can be submitted without a driver's number or a remembered ride month.
alter table public.ride_reports
  alter column trip_month drop not null;

alter table public.ride_reports
  drop constraint if exists ride_reports_driver_contact_required;

alter table public.ride_reports
  add constraint ride_reports_driver_contact_valid
  check (
    driver_contact is null
    or (
      driver_contact ~ '^[+0-9() -]{9,24}$'
      and char_length(regexp_replace(driver_contact, '[^0-9]', '', 'g')) between 9 and 15
    )
  ) not valid;
