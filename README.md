# Hifazati (حفاظتی)

A Lahore ride-reporting prototype. Riders can submit a private report, and the public dashboard shows only reviewed, aggregated patterns. The interface uses a light dashboard layout with white cards, a gray background, and muted red accents.

The landing page is at `/`, with a one-time 4.8-second reveal of the mixed Urdu-English logo. The dashboard is at `/dashboard`; `/dashboard?view=report` opens the private report form directly. The animation is skipped when a visitor requests reduced motion.

## Run locally

```powershell
npm.cmd run dev
```

Open the local URL shown in the terminal. **There is no seeded or fictional report data.** The production Vercel project is connected to a free Supabase database. For local development with that connection, run `vercel.cmd env run -e development -- npm.cmd run dev`. The app does not store reports in browser local storage.

## Database setup

The production database is provisioned through the Vercel Supabase integration. [`supabase/schema.sql`](supabase/schema.sql) has been applied. Vercel injects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the app. If using a separate Supabase project, apply the same schema and set those two variables before deploying.

Riders register and log in with an email address and password through Supabase Auth. For this short demo, Supabase Auth's **Confirm Email** setting is disabled so accounts become usable immediately without an SMTP provider. Email addresses are therefore not verified. Before a public launch, configure a verified SMTP sender, turn Confirm Email back on, set the Auth Site URL to `https://hifazati.vercel.app`, and add that URL to the redirect allow list. Password recovery also requires email delivery and is not offered in this demo.

Only signed-in users can submit to `ride_reports`. Anonymous visitors and signed-in users cannot read or edit raw reports. Review reports in the Supabase dashboard, set accepted reports' `review_status` to `reviewed`, then add only genuinely reviewed groups of at least three to `public_ride_trends`. The public dashboard reads from that separate aggregate table. It never displays free-text descriptions or identifying details.

Use only the Supabase **publishable** key in the frontend. Never add a service-role key to a `NEXT_PUBLIC_` variable. The app asks riders not to include names, phone numbers, number plates, or exact addresses.
