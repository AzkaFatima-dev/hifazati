# Hifazati (حفاظتی)

A Lahore ride-reporting prototype. Riders can submit a private report, and the public dashboard shows only reviewed, aggregated patterns. The interface uses a light dashboard layout with white cards, a gray background, and muted red accents.

## Run locally

```powershell
npm.cmd run dev
```

Open the local URL shown in the terminal. **There is no seeded or fictional report data.** The production Vercel project is connected to a free Supabase database. For local development with that connection, run `vercel.cmd env run -e development -- npm.cmd run dev`. The app does not store reports in browser local storage.

## Database setup

The production database is provisioned through the Vercel Supabase integration. [`supabase/schema.sql`](supabase/schema.sql) has been applied. Vercel injects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the app. If using a separate Supabase project, apply the same schema and set those two variables before deploying.

Riders register and log in with an email address and password through Supabase Auth. Hosted Supabase projects require email confirmation by default. Set the Supabase Auth **Site URL** to `https://hifazati.vercel.app`, allow `https://hifazati.vercel.app/**` as a redirect URL, and configure a verified custom SMTP sender before inviting the public. Supabase's default email sender only reaches project team members. Password reset uses the same email sender and redirect URL.

Only signed-in users can submit to `ride_reports`. Anonymous visitors and signed-in users cannot read or edit raw reports. Review reports in the Supabase dashboard, set accepted reports' `review_status` to `reviewed`, then add only genuinely reviewed groups of at least three to `public_ride_trends`. The public dashboard reads from that separate aggregate table. It never displays free-text descriptions or identifying details.

Use only the Supabase **publishable** key in the frontend. Never add a service-role key to a `NEXT_PUBLIC_` variable. The app asks riders not to include names, phone numbers, number plates, or exact addresses.
