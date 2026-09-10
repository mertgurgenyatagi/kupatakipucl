# stopbilling

Cloud Run function that auto-disables billing on the `kupatakipucl` project when
a budget alert reports cost exceeding budget. Triggered by the `billing-alerts`
Pub/Sub topic (wired to Cloud Billing budget notifications) via an Eventarc
trigger on the `stopbilling` Cloud Run service in `europe-west8`.

## Prerequisites (one-time, already done as of 2026-07-20; Firestore role added 2026-09-10)

- `cloudbilling.googleapis.com` must be enabled on the project — without it,
  every invocation fails with `PERMISSION_DENIED` before it can read or touch
  billing state at all.
- The service must run as a dedicated service account (`stopbilling-sa`) with
  `roles/billing.projectManager` (to unlink billing), `roles/browser` (to
  read billing info via `resourcemanager.projects.get`), and
  **`roles/datastore.user`** (to read/write `stopbilling/state`, added
  2026-09-10 — see "Repeat-trip guard" below) on the project.
- `PROJECT_ID` env var must be set on the Cloud Run service.

## Repeat-trip guard, added 2026-09-10

**The problem this fixes.** Google resends the "you're over budget" Pub/Sub
notification multiple times a day for as long as month-to-date cost stays
over budget — not only when something new happens. A calendar month's cost
never goes down on its own, so the old version of this function (which had
no memory at all — every invocation asked fresh "is cost over budget right
now") would re-disable billing within 15-40 minutes of any manual re-link,
for as long as the month stayed over budget, regardless of whether anything
was actually still spending. This fired four times on 2026-09-09
(PROJECT.md §1) — trips #2 and #4 were exactly this: a deliberate re-link,
immediately caught by a stale re-notification of the same already-actioned
overage.

**The fix.** `actionGuard.js`'s `shouldDisableBilling` (pure, unit-tested in
`actionGuard.test.js`) compares the incoming `costAmount` against
`lastActionedCost` — the cost this function last actually disabled billing
at, persisted in `stopbilling/state`. It only acts again if that number has
gone up (genuine new spend) or down (month-to-date cost can only drop when a
new billing period starts, so a lower number means the calendar rolled
over). An exact repeat of the same figure — Google re-reporting the same
stale overage — is now a no-op. See `actionGuard.js`'s own comment for the
full reasoning.

This does not make the function slower to react to a real problem — it
still fires immediately the first time any given cost figure exceeds
budget. It only stops it from re-firing on a number it's already acted on.

## Deploy

```
gcloud run deploy stopbilling \
  --source=functions/stopbilling \
  --function=stopBillingOnBudgetExceeded \
  --region=europe-west8 \
  --service-account=stopbilling-sa@kupatakipucl.iam.gserviceaccount.com \
  --set-env-vars=PROJECT_ID=kupatakipucl
```

Deploy from the CLI, not the Cloud Run console's "Edit & deploy new revision"
flow — that flow has silently reverted this service to the generic
`gcr.io/cloudrun/placeholder` image before (no build step run, env vars kept,
code silently not deployed). The console's "Source" tab (inline source editor)
is safe; the "Edit & deploy new revision" config-only flow is not.
