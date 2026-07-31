# leaderboard

Firestore-triggered Cloud Function that recomputes the whole leaderboard
whenever `predictions/{uid}` or `results/{teamId}` changes, and writes the
result to `leaderboardCache/current` — a single doc every client reads
(live) instead of downloading the full `predictions` + `profiles`
collections and redoing the scoring math on every page visit.

Unlike `functions/stopbilling` (a Cloud Run service deployed manually via
`gcloud run deploy`), this one is a normal Firebase Function managed by the
Firebase CLI — deploy with:

```
firebase deploy --only functions:leaderboard
```

`firestore.rules` locks `leaderboardCache/{docId}` to `allow write: if false`
for every client — only this function (running under the Admin SDK, which
bypasses security rules) can write it.
