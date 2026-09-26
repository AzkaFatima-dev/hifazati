-- Require a written account for new reports while preserving existing rows.
alter table public.ride_reports
  add constraint ride_reports_details_required
  check (details is not null and char_length(btrim(details)) > 0) not valid;
