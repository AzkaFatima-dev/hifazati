-- Hifazati MVP: private incoming reports and a separate public aggregate table.
-- Run this in Supabase SQL Editor. Do not add public read access to ride_reports.

create table if not exists public.ride_reports (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('Uber', 'inDrive', 'Yango', 'Other')),
  issue_type text not null check (issue_type in (
    'Harassment', 'Unsafe driving', 'Route concern', 'Fare or payment',
    'Unprofessional conduct', 'Other'
  )),
  area text not null check (area in (
    'Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Cantt', 'Walled City', 'Other Lahore'
  )),
  trip_month date not null check (extract(day from trip_month) = 1),
  details text check (details is null or char_length(details) <= 280),
  review_status text not null default 'pending' check (review_status in ('pending', 'reviewed', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.ride_reports enable row level security;
revoke all on table public.ride_reports from anon, authenticated;
grant insert on table public.ride_reports to authenticated;

drop policy if exists "Anyone can submit a pending report" on public.ride_reports;
drop policy if exists "Signed-in riders can submit pending reports" on public.ride_reports;
create policy "Signed-in riders can submit pending reports"
  on public.ride_reports for insert to authenticated
  with check (auth.uid() is not null and review_status = 'pending');

create table if not exists public.public_ride_trends (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('Uber', 'inDrive', 'Yango', 'Other')),
  issue_type text not null check (issue_type in (
    'Harassment', 'Unsafe driving', 'Route concern', 'Fare or payment',
    'Unprofessional conduct', 'Other'
  )),
  area text not null check (area in (
    'Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Cantt', 'Walled City', 'Other Lahore'
  )),
  report_count integer not null check (report_count >= 3),
  updated_at timestamptz not null default now(),
  unique (provider, issue_type, area)
);

alter table public.public_ride_trends enable row level security;
revoke all on table public.public_ride_trends from anon, authenticated;
grant select on table public.public_ride_trends to anon, authenticated;

drop policy if exists "Anyone can read aggregate trends" on public.public_ride_trends;
create policy "Anyone can read aggregate trends"
  on public.public_ride_trends for select to anon, authenticated
  using (true);

-- To seed the live dashboard for a presentation, insert reviewed, genuinely
-- aggregated counts here. Never copy individual narrative reports into this table.
