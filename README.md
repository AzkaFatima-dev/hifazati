# Raasta — Lahore ride experiences

Hackathon prototype for privately submitting rideshare incident reports and showing aggregated community patterns.

## Run it locally

```powershell
npm.cmd run dev
```

Open the local URL shown in the terminal. With no Supabase keys, the site runs in **demo mode**. Reports are saved only in that browser's local storage, and the dashboard starts with clearly labelled illustrative sample data.

## Connect Supabase

1. Create a Supabase project.
2. Open **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local`; set the project URL and **publishable key** from the Supabase project settings.
4. Restart `npm run dev`.

Incoming reports go to `ride_reports`. Anonymous visitors can insert pending reports, but cannot read or edit them. Review submissions in the Supabase dashboard. Add only reviewed, genuinely aggregated groups to `public_ride_trends`; each row must contain a count of at least three. The public app can read that aggregate table only.

Do not put a Supabase secret or service-role key in `.env.local` or frontend code. Do not publish individual reports, names, number plates, exact addresses, screenshots, or identifying details. The optional free-text report detail remains private in the reports table for review.

## Product scope

- Report form: provider, issue, broad Lahore area, trip month, optional private context.
- Community pulse: grouped counts, service filter, minimum visible group size of three.
- No user accounts, driver profiles, public accusations, or emergency response claims.

## Deploy

Deploy the `ridesafe-lahore` folder as a Next.js project on Vercel. If using Supabase mode, add the two `.env.local` values as Vercel environment variables, then redeploy. Until someone reviews reports and updates the aggregate table, the shared dashboard will be empty by design.
