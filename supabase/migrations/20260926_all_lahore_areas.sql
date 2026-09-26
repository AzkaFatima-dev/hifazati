-- Riders may name any Lahore neighborhood; fixed area enums excluded localities.
alter table public.ride_reports drop constraint if exists ride_reports_area_check;
alter table public.ride_reports add constraint ride_reports_area_length
  check (char_length(btrim(area)) between 2 and 80) not valid;

alter table public.public_ride_trends drop constraint if exists public_ride_trends_area_check;
alter table public.public_ride_trends add constraint public_ride_trends_area_length
  check (char_length(btrim(area)) between 2 and 80) not valid;
