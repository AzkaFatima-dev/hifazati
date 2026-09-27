# Hifazati QA review — 27 September 2026

## Scope and result

Audited authentication, report intake, proof storage, driver lookup, account and anonymous report ownership, deletion, public trend integrity, responsive pages, accessibility, deployment, and dependencies. The database changes listed below were applied to the live Supabase project. Browser and API checks used temporary QA fixtures that were removed after testing; no sample report was published.

The live database inventory at the last check contained **0 reports, 0 public trends, 0 private proof files, and 0 pending deletion jobs**. These numbers can change when riders submit reports. A single reviewed report can be counted in a signed-in rider's exact-match search, while a public dashboard group requires at least three matching reviewed reports.

## Findings fixed

| Severity | Finding | Change and evidence |
| --- | --- | --- |
| Critical | A SQL `NULL` comparison could authorize deleting an account or guest report with the wrong kind of credential. | The stored function now rejects any comparison that is not explicitly `TRUE`. Eight owner/receipt cases passed in rolled-back database transactions; cross-account API deletion returned 404. |
| High | Signed proof upload URLs could be requested without an intake quota. | Added an atomic, private hourly limit per connection, a MIME allowlist on the private bucket, and bounded JSON request bodies. Limits were checked at their boundary in the database. |
| High | A manually published trend could claim three reviewed reports when fewer existed; changing a reviewed report to rejected could leave a stale public count. | Database validation now requires at least three actual reviewed reports for the same service, concern, and area. A status-change trigger removes or reduces stale counts. Both cases passed transactional checks. |
| Medium | Dashboard navigation lost the chosen section on refresh and browser Back. | Navigation now uses the route query. Desktop and mobile browser checks passed. |
| Medium | Anonymous receipts were not usable in the current visit if browser storage failed, and the UI incorrectly said they were saved. | The receipt remains available during the visit and the UI tells the rider to copy it privately. |
| Medium | Many light-gray labels failed WCAG AA contrast checks. | Darkened text within the existing gray, white, and red palette. A follow-up scan found no reported violations in the affected views. |

## Verification

- **Database:** 50/50 permission, ownership, quota, and trend checks passed. Transactional test records were rolled back.
- **API:** 49 checks passed using real Clerk test sessions and private Supabase uploads. This covered required fields, account separation, pending and reviewed search results, private receipts, and proof deletion. QA accounts, reports, files, and lookup attempts were removed.
- **Browser:** 78 checks passed across 1440px, 390px, and 320px layouts. All five main views loaded without horizontal overflow or JavaScript runtime errors. The final targeted accessibility scan reported zero violations on the two views that still had contrast findings.
- **Build:** ESLint and production build passed. `npm audit` reported zero vulnerabilities at the time of review.
- **Deployment:** Commit `cf362a8` deployed successfully to `hifazati.vercel.app`. Production API checks passed through authentication, report creation, ownership separation, private proof storage, and reviewed name/phone/photo lookups. A network connection timeout interrupted the later guest-report portion. The one QA report and two QA accounts left by that interruption were removed; a follow-up inventory found zero QA reports, QA accounts, and proof files. The full 49-check API run passed locally against the same Supabase and Clerk development projects before deployment.

Run the repeatable checks with `npm.cmd run qa:db`, `npm.cmd run qa:api`, and `npm.cmd run qa:browser` after providing `.env.qa.local` and starting the local QA server with `node scripts/qa-server.mjs .env.qa.local`. The API check creates temporary users and reports. Browser screenshots are placed in the ignored `qa-artifacts` directory.

## Product limits to keep visible

`reviewed` means a submitted report was checked for inclusion in search. It does not establish that the alleged incident happened or identify the driver conclusively. Hifazati has no independent confirmation workflow today. Photo search matches the exact file hash; it does not recognize the same person across different photos.

Proof uploads are private, but MIME and size checks do not establish authenticity or scan for malware. The report-review decision remains manual in Supabase. An upload abandoned before submission can leave a private orphan file; administrators should periodically remove old orphaned files. If proof removal after a report deletion fails, its file paths remain in `report_deletion_jobs` for administrator cleanup.

The public demo currently uses Clerk development keys. An owned domain and Clerk production keys are needed for a normal production launch.
The browser review confirmed that login and registration controls render, while API tests used valid Clerk sessions; manual email-and-password form entry was not part of this automated run.
