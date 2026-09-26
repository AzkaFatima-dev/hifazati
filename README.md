# Hifazati (حفاظتی)

A Lahore ride-reporting prototype. Riders can submit an anonymous private report with supporting proof. The public dashboard shows only reviewed, aggregated patterns; it contains no fictional reports or individual allegations.

The landing page is at `/`. Its mixed Urdu-English logo is revealed over 4.8 seconds, with a replay control and a reduced-motion fallback. The dashboard is at `/dashboard`; `/dashboard?view=report` opens the report form.

## Run locally

```powershell
npm.cmd install
vercel.cmd env run -e development -- npm.cmd run dev
```

The app uses a Supabase database provisioned through Vercel. It does not store reports in browser local storage. The browser needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; server routes need `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key with a `NEXT_PUBLIC_` prefix.

## Database and auth

For a new Supabase project, apply [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/migrations/20260926_anonymous_evidence.sql`](supabase/migrations/20260926_anonymous_evidence.sql), then [`supabase/migrations/20260926_required_details.sql`](supabase/migrations/20260926_required_details.sql). Both migrations are applied to the production project. They create a private `report-evidence` bucket and change raw report writes to server-only. Report records include a written account, driver contact number, and 1–3 proof paths. The driver photo is optional; a service description is required when the rider chooses Other. Each proof file may be up to 20 MB; the driver photo may be up to 8 MB.

The report form requests a short-lived signed upload URL from the server, uploads proof directly to the private bucket, then submits the structured report to `/api/reports`. The server checks the required fields and confirms the files exist before saving the report. Anonymous and signed-in visitors can submit, but neither can read raw reports or proof files. Uploaded files are accessible to project administrators in Supabase for review. A failed or abandoned submission can leave orphaned private files; administrators should remove these periodically.

Riders may also register and log in with an email address and password through Supabase Auth. For this demo, Supabase Auth's **Confirm Email** setting is disabled so accounts work immediately without SMTP. Email addresses are therefore not verified. Before a public launch, configure a verified SMTP sender, enable Confirm Email, and set the Auth Site URL and redirect allow list to the deployed site. Password recovery requires email delivery and is not offered in this demo.

Review reports in the Supabase dashboard, update accepted reports' `review_status` to `reviewed`, then add only genuinely reviewed groups of at least three to `public_ride_trends`. The dashboard reads from that separate aggregate table. It never displays descriptions, driver phone numbers, or uploaded files. User-submitted proof is supporting material, not independent verification of a claim.

## Landing photos

Images are used under the [Unsplash License](https://unsplash.com/license): [Shazaf Zafar's Lahore street](https://unsplash.com/photos/an-alley-way-with-a-car-parked-on-the-side-of-it-bOpkB2fcWWQ), [Nicholas Ng's phone in a car](https://unsplash.com/photos/hand-holding-a-white-smartphone-inside-a-car-aD0ejFwyG0c), and [abdullah shehroz's Lahore road](https://unsplash.com/photos/a-person-riding-a-motorcycle-down-a-street-GiaySwqSUxk).
