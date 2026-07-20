# stopbilling

Cloud Run function that auto-disables billing on the `kupatakipucl` project when
a budget alert reports cost exceeding budget. Triggered by the `billing-alerts`
Pub/Sub topic (wired to Cloud Billing budget notifications) via an Eventarc
trigger on the `stopbilling` Cloud Run service in `europe-west8`.

## Prerequisites (one-time, already done as of 2026-07-20)

- `cloudbilling.googleapis.com` must be enabled on the project — without it,
  every invocation fails with `PERMISSION_DENIED` before it can read or touch
  billing state at all.
- The service must run as a dedicated service account (`stopbilling-sa`) with
  `roles/billing.projectManager` (to unlink billing) and `roles/browser` (to
  read billing info via `resourcemanager.projects.get`) on the project.
- `PROJECT_ID` env var must be set on the Cloud Run service.

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
