# Hifazati (حفاظتی)

A Lahore ride-reporting prototype. Riders can submit a private report, and the public dashboard shows only reviewed, aggregated patterns. The interface uses a light dashboard layout with white cards, a gray background, and muted red accents.

## Run locally

```powershell
npm.cmd run dev
```

Open the local URL shown in the terminal. **There is no seeded or fictional report data.** Without a Supabase connection, the dashboard shows an empty state and report submission is unavailable. The app does not store reports in browser local storage.

## Connect real data

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.
3. Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key.
4. Restart `npm.cmd run dev`. For Vercel, add those same two values as project environment variables and redeploy.

The form inserts into `ride_reports`. Anonymous visitors cannot read or edit that table. Review reports in the Supabase dashboard, then add only genuinely reviewed groups of at least three to `public_ride_trends`. The public dashboard reads from that separate aggregate table. It never displays free-text descriptions or identifying details.

Use only the Supabase **publishable** key in the frontend. Never add a service-role key to a `NEXT_PUBLIC_` variable. The app asks riders not to include names, phone numbers, number plates, or exact addresses.
