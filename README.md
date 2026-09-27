# Hifazati (حفاظتی)

A Lahore ride-reporting prototype. Riders can submit an anonymous private report with supporting proof. The public dashboard shows only reviewed, aggregated patterns; it contains no fictional reports or individual allegations.

The landing page is at `/`. Its mixed Urdu-English logo is revealed over 4.8 seconds, with a replay control and a reduced-motion fallback. The dashboard is at `/dashboard`; `/dashboard?view=report` opens the report form.

## Run locally

```powershell
npm.cmd install
vercel.cmd env run -e development -- npm.cmd run dev
```

The app uses a Supabase database provisioned through Vercel. It does not store reports in browser local storage. The browser needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; report routes need `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Clerk uses `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in the browser and `CLERK_SECRET_KEY` on the server. Never put either secret key in a `NEXT_PUBLIC_` variable.

## Database and auth

For a new Supabase project, apply [`supabase/schema.sql`](supabase/schema.sql), then the migrations in [`supabase/migrations`](supabase/migrations) in filename order. All migrations are applied to production. They create a private `report-evidence` bucket and change raw report writes to server-only. Report records require a written account, Lahore area, and 1–3 proof paths. The ride month, driver contact number, and driver photo are optional; a service description is required when the rider chooses Other. Each proof file may be up to 20 MB; the driver photo may be up to 8 MB.

The area field suggests common Lahore neighborhoods and accepts any other Lahore locality typed by the rider. The suggestions are not an exhaustive administrative list; the [Lahore district union-council list](https://lahore.punjab.gov.pk/constituencies) alone contains 274 entries. Riders should enter a neighborhood rather than an exact address. Reviewers can standardize spelling before publishing grouped trends.

The report form requests a short-lived signed upload URL from the server, uploads proof directly to the private bucket, then submits the structured report to `/api/reports`. The server checks the required fields and confirms the files exist before saving the report. Anonymous and signed-in visitors can submit, but neither can read raw reports or proof files. Uploaded files are accessible to project administrators in Supabase for review. A failed or abandoned submission can leave orphaned private files; administrators should remove these periodically.

Riders register, log in, and manage accounts with Clerk. Anonymous reports remain available without an account; proof storage and reviewed trend data remain on Supabase. The previous Supabase Auth user cannot use that password with Clerk and needs to register in Clerk. Reports were never linked to Supabase user IDs. Clerk sign-up and email verification behavior follows the configured Clerk instance settings. The current public demo uses Clerk development keys on a `vercel.app` domain; before a production launch, use an owned domain and Clerk production keys.

Review reports in the Supabase dashboard, update accepted reports' `review_status` to `reviewed`, then add only genuinely reviewed groups of at least three to `public_ride_trends`. The dashboard reads from that separate aggregate table. It never displays descriptions, driver phone numbers, or uploaded files. User-submitted proof is supporting material, not independent verification of a claim.

## Landing photos

The driver-and-passenger image in “The Idea” section was generated for Hifazati. The other images are used under the [Unsplash License](https://unsplash.com/license): [Shazaf Zafar's Lahore street](https://unsplash.com/photos/an-alley-way-with-a-car-parked-on-the-side-of-it-bOpkB2fcWWQ) and [abdullah shehroz's Lahore road](https://unsplash.com/photos/a-person-riding-a-motorcycle-down-a-street-GiaySwqSUxk).
