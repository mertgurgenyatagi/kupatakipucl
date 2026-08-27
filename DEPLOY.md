# Deploying kupatakipucl

The site is a static Vite build published to **GitHub Pages** from GitHub
Actions, served at **https://kupatakipucl.com**.

Nothing here is automatic on first use: the repository is fully prepared, but
two switches are deliberately left for Mert to throw, because throwing them is
what puts the site on the internet. They are in §3.

---

## 1. How it works

`.github/workflows/deploy.yml` runs on every push to `main` (and on manual
dispatch from the Actions tab). It:

1. `npm ci`
2. runs the full unit suite — a failing test blocks the deploy
3. `npm run build` (`tsc -b && vite build`) → `dist/`
4. asserts the Firebase config actually landed in the bundle, and that
   `dist/CNAME` still says `kupatakipucl.com`
5. uploads `dist/` as a Pages artifact and deploys it

`.github/workflows/ci.yml` runs on *every* branch and pull request — typecheck,
unit tests, build, plus the Firestore-emulator integration suite on a JDK 21
runner. It publishes nothing.

Publishing from an artifact rather than a `gh-pages` branch means no build
output is ever committed and every deploy is reproducible from a clean checkout.

### Why this works without rewrite rules

`vite.config.ts` sets `base: "./"` and the app uses `HashRouter`, so every route
is `https://kupatakipucl.com/#/whatever`. The server only ever serves
`index.html`. GitHub Pages needs no SPA fallback, no 404.html trick.

### One constraint to know about

Runtime asset paths are **root-absolute** — `/club-badges/…`, `/hero/…`,
`/brand/…` in `teams.ts`, `HeroCarousel.tsx` and the About pages. That is correct
for a domain root and only for a domain root. If the site is ever served from a
project subpath (`user.github.io/kupatakipucl/`), every crest and hero image
404s while the app itself loads fine. `public/CNAME` is what keeps that from
happening, which is why `deploy.yml` asserts it survived the build.

---

## 2. Already done — no action needed

- **`public/CNAME`** contains `kupatakipucl.com`. Vite copies it into `dist/`,
  and Pages reads it to set the custom domain.
- **`.env`** is committed, so a clean checkout builds a working app.
  See the comment at the top of that file for why that is safe — in short, Vite
  inlines these values into the public JS bundle anyway.
- **`index.html`** `og:`/`twitter:` tags point at `https://kupatakipucl.com/`
  (they pointed at `kupatakipucl.web.app`, a host that will never exist).
- **Firebase Auth authorized domains** now include `kupatakipucl.com` and
  `www.kupatakipucl.com`, verified by reading the config back from production:

  ```
  localhost, kupatakipucl.firebaseapp.com, kupatakipucl.web.app,
  kupatakipucl.com, www.kupatakipucl.com
  ```

  Without this, Google sign-in fails outright on the real domain — the popup
  opens and immediately errors. It is the single most silent way this launch
  could break.

---

## 3. What Mert has to do

### Step 1 — Merge `launch-prep` into `main`

Deploys only run from `main`.

### Step 2 — Enable GitHub Pages

Repository → **Settings** → **Pages** → **Build and deployment** → **Source**:
select **GitHub Actions**.

Do not pick "Deploy from a branch". Until this is set, `deploy.yml` fails at the
`configure-pages` step with an explicit error and publishes nothing — that is
intentional, not a bug.

Once Pages is enabled and a deploy has run, the same page will show a **Custom
domain** box already filled in with `kupatakipucl.com`, picked up from
`public/CNAME`. It will warn that DNS does not resolve yet. That is expected
until step 3.

### Step 3 — Point the DNS at Spaceship

`kupatakipucl.com` currently resolves to `34.216.117.25` and `54.149.79.189`,
which is **Spaceship's parking page**. Those records must be **deleted**, not
just added to — leaving them in place means visitors get the parking page
roughly half the time, at random.

In Spaceship: **Domains → kupatakipucl.com → Advanced DNS**.

**Delete** every existing `A` record on the root host (and any `CNAME` on `www`,
and Spaceship's parking/redirect entry if one is listed separately).

**Add** these four:

| Type | Host | Value | TTL |
|------|------|-----------------|-----|
| A | `@` | `185.199.108.153` | Automatic |
| A | `@` | `185.199.109.153` | Automatic |
| A | `@` | `185.199.110.153` | Automatic |
| A | `@` | `185.199.111.153` | Automatic |

All four verified live from this machine on 2026-08-27 — each answers with
`Server: GitHub.com`.

**And this one, so `www.kupatakipucl.com` works too:**

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | `www` | `mertgurgenyatagi.github.io` | Automatic |

Note the trailing dot Spaceship may add automatically — that is fine. The value
is the **account** subdomain, not the repository.

<details>
<summary>Optional IPv6 (AAAA) records</summary>

GitHub also publishes IPv6 addresses for Pages. They are optional; the A records
alone serve every visitor. **These four could not be verified from this machine,
which has no IPv6 route** — unlike the A records above, treat them as unconfirmed
and check them against GitHub's current documentation before adding:

`2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`,
`2606:50c0:8003::153` — all as `AAAA` on host `@`.
</details>

### Step 4 — Wait, then turn on HTTPS

DNS usually propagates in minutes at Spaceship but is allowed to take up to 24
hours. Once GitHub's Pages settings page stops warning about DNS, tick
**Enforce HTTPS**. The certificate is issued automatically and can take another
15 minutes or so. Until it exists, the site is HTTP-only and Google sign-in will
refuse to run.

---

## 4. Verifying before you point the DNS

You do not need a public URL to check the production build. `localhost` is an
authorized Firebase domain, so a local preview exercises the real bundle,
including real Google sign-in against production Firestore:

```
npm run build
npm run preview
```

This serves the exact artifact the deploy publishes. Sign in, submit nothing,
and confirm the crests load and the countdown reads correctly.

## 5. Verifying after

```
curl -sI https://kupatakipucl.com | head -3       # expect HTTP/2 200, Server: GitHub.com
curl -s https://kupatakipucl.com | grep og:url    # expect https://kupatakipucl.com/
```

Then, in a browser: sign in with Google. If the popup opens and closes with
`auth/unauthorized-domain`, the authorized-domains list in §2 has been changed.

## 6. Taking it down

Settings → Pages → Source → **None**. The DNS records can stay; they will just
serve GitHub's 404. Nothing about Firebase needs reverting.

---

## 7. Backend deploys, for reference

The frontend is the only thing GitHub Actions touches. The backend is deployed
by hand from this machine and was not changed by this work:

```
firebase deploy --only firestore:rules,storage,database   # security rules
firebase deploy --only functions:leaderboard              # leaderboard functions
```

`functions/stopbilling` is a Cloud Run service deployed with `gcloud run deploy`
— see `functions/stopbilling/README.md`, and heed its warning about the Cloud
Run console's "Edit & deploy new revision" flow.
