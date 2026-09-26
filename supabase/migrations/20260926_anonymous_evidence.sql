-- Private, anonymous intake. Existing reports remain untouched.
-- Only the server's service-role client can write raw reports.

alter table public.ride_reports
  add column if not exists provider_other text,
  add column if not exists driver_contact text,
  add column if not exists evidence_paths text[] not null default '{}',
  add column if not exists driver_photo_path text;

alter table public.ride_reports drop constraint if exists ride_reports_provider_check;
alter table public.ride_reports add constraint ride_reports_provider_check
  check (provider in ('Uber', 'inDrive', 'Yango', 'Bykea', 'Careem', 'Other'));

alter table public.ride_reports drop constraint if exists ride_reports_issue_type_check;
alter table public.ride_reports add constraint ride_reports_issue_type_check
  check (issue_type in (
    'Harassment', 'Fraud or scam', 'Unsafe driving', 'Route concern',
    'Fare or payment', 'Unprofessional conduct', 'Other'
  ));

alter table public.ride_reports drop constraint if exists ride_reports_details_check;
alter table public.ride_reports add constraint ride_reports_details_check
  check (details is null or char_length(details) <= 2000);

alter table public.ride_reports drop constraint if exists ride_reports_other_provider_required;
alter table public.ride_reports add constraint ride_reports_other_provider_required
  check (provider <> 'Other' or (provider_other is not null and char_length(trim(provider_other)) between 3 and 160)) not valid;

alter table public.ride_reports drop constraint if exists ride_reports_driver_contact_required;
alter table public.ride_reports add constraint ride_reports_driver_contact_required
  check (
    driver_contact is not null
    and driver_contact ~ '^[+0-9() -]{9,24}$'
    and char_length(regexp_replace(driver_contact, '[^0-9]', '', 'g')) between 9 and 15
  ) not valid;

alter table public.ride_reports drop constraint if exists ride_reports_evidence_required;
alter table public.ride_reports add constraint ride_reports_evidence_required
  check (cardinality(evidence_paths) between 1 and 3) not valid;

revoke all on table public.ride_reports from anon, authenticated;
drop policy if exists "Signed-in riders can submit pending reports" on public.ride_reports;
drop policy if exists "Anyone can submit a pending report" on public.ride_reports;

alter table public.public_ride_trends drop constraint if exists public_ride_trends_provider_check;
alter table public.public_ride_trends add constraint public_ride_trends_provider_check
  check (provider in ('Uber', 'inDrive', 'Yango', 'Bykea', 'Careem', 'Other'));

alter table public.public_ride_trends drop constraint if exists public_ride_trends_issue_type_check;
alter table public.public_ride_trends add constraint public_ride_trends_issue_type_check
  check (issue_type in (
    'Harassment', 'Fraud or scam', 'Unsafe driving', 'Route concern',
    'Fare or payment', 'Unprofessional conduct', 'Other'
  ));

insert into storage.buckets (id, name, public, file_size_limit)
values ('report-evidence', 'report-evidence', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

-- No storage.objects select policy is added for anon or authenticated roles.
-- Uploads use a short-lived signed URL issued by the server; only the project
-- owner/service role can inspect evidence and optional driver photos.
