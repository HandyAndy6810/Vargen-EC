# Shipping a change — republish, build, or update?

Three ways a change reaches a phone, and they cover different things. Getting this
wrong costs either twenty minutes on a build you didn't need, or an afternoon
wondering why a fix "didn't work" when it never left the repo.

## The short version

| You changed | What it needs |
|---|---|
| `server/`, `drizzle.config.ts` | **Republish** on Replit |
| `shared/schema.ts` | **Republish** — it runs `db:push` |
| `shared/` anything else | **Republish** *and* one of the two below — both sides import it |
| `mobile/app`, `hooks`, `lib`, `components` | **OTA update** |
| `mobile/package.json` (a new package) | **Build** |
| `mobile/app.json`, a config plugin, permissions | **Build** |
| `version` in `app.json`, or an SDK upgrade | **Build** |

Anything in doubt: a build always works. An OTA update never breaks a phone that
can't take it — it simply won't apply.

## Republish (the backend)

On Replit:

```bash
git pull --no-edit origin main
```

then press **Republish** and wait for it. Confirm in the deployment log:

```
[startup] database: ep-lingering-mountain-...neon.tech/neondb (from APP_DATABASE_URL)
[startup] sessions: ep-lingering-mountain-...neon.tech/neondb (from APP_DATABASE_URL)
[express] startup complete — routes ready
```

Both lines matter. If `sessions:` is missing, the deployment is running old code.
A republish signs everyone out, because the session store is restarted.

## OTA update (JavaScript only)

This is the fast path and it should be the normal one. Seconds, not minutes, and
it does not touch the EAS build quota.

```bash
cd mobile
npm run update:preview -- -m "what changed"
```

The app picks it up on its next cold start. `update:production` does the same for
the App Store build.

**Only ever publish an update from a commit CI has passed.** An OTA update goes
straight onto real phones with nothing in between — no build step, no review, no
second chance to notice. The two-minute check is the only thing standing between a
typo and every user having it.

### What OTA cannot do

Native code. A new package with a native module, a config plugin, a permission
string, an SDK upgrade, or bumping `version` — all of those need a real build. The
runtime version is tied to `version` in `app.json`, so bumping it deliberately cuts
older builds off from new updates, which is the behaviour you want.

## Build (EAS)

```bash
cd mobile && npx eas-cli build --profile preview --platform ios --non-interactive
```

Twenty minutes or so, and it consumes build quota — limited on the free plan, and
it resets monthly. Check CI is green first; there is no faster way to waste twenty
minutes than building a commit that could never have compiled.

**A build is also what activates OTA updates for a device.** A phone only receives
updates published to the channel it was built with (`preview` / `production` in
`eas.json`), so a build made before those channels existed will never see one.

## Installing packages — read this

`npm install` on Replit writes **Replit's own npm proxy** into the lockfile:

```
"resolved": "http://package-firewall.replit.internal/npm/..."
```

That host only exists inside Replit. CI and the EAS build servers cannot resolve
it, and the failure reads as a network problem rather than what it is. CI now
refuses any lockfile containing one — rewrite those `resolved` URLs to
`https://registry.npmjs.org/...` and leave the integrity hashes alone.
