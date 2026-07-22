# The phone-bridge pattern

How Kiln Manager pairs a phone with a desktop app and moves data between them,
written so the same thing can be rebuilt for a different application.

Nothing here is specific to kilns except the payload. The pattern is: **a
desktop app, a small installable web app on the phone, and a dumb mailbox in
between, with no accounts and no servers you have to run.**

Read this end to end before writing code. Several of the decisions look
arbitrary and are not — the "why not" sections are the expensive part.

---

## 1. What problem this solves

Someone is standing away from their computer (in a workshop, a warehouse, a
field) and needs to record something. Later, the data has to end up in the
desktop app that does the real work.

Constraints that shaped everything:

- **No accounts.** No sign-up, no password, no email. Pairing is a scan.
- **Offline-capable on the phone.** The studio's Wi-Fi may not reach; the
  recording must work in Airplane Mode and sync later.
- **The computer is not always on**, or not on the same network, or not in the
  same building. So the phone can't push straight to it.
- **Local-first.** The desktop owns the data. Nothing sensitive lives in the
  cloud; what passes through is minimal and self-deletes.
- **Nothing to run.** No VPS, no database, no backend service to babysit.

---

## 2. Approaches that do not work

Do not spend a day rediscovering these.

### The desktop app serving the web app over the LAN

Tempting: press a button, the desktop starts a local HTTP server, shows a QR at
`http://192.168.1.x:port`, the phone opens it. **It fails on the requirement
that matters most: offline.**

- A service worker — the only way to make a web app work with no network —
  requires a *secure context*. `localhost` counts; `http://192.168.1.x` does
  not. So the app can never be installed or work offline.
- If you instead host the web app over HTTPS and have it call the desktop over
  `http://` on the LAN, the browser blocks it as **mixed content**.
- Getting a real certificate for a LAN IP is not possible in any way an
  ordinary user can do.

If offline is not a requirement, LAN serving is fine and simpler. Decide this
first, because it is the fork in the road.

### A "real" backend

Works, but you now run a service, hold user data, and have an account system to
build. Everything below exists to avoid that.

---

## 3. The three pieces

```
┌────────────────┐        PUT /down          ┌──────────────┐
│  Desktop app   │ ────────────────────────▶ │              │
│  (owns data)   │ ◀──────────────────────── │    Relay     │
└────────────────┘   GET /up, DELETE /up     │  (mailbox)   │
                                             │              │
┌────────────────┐   GET /down               │  Cloudflare  │
│  Phone web app │ ────────────────────────▶ │  Worker + KV │
│  (PWA)         │ ◀──────────────────────── │              │
└────────────────┘   POST /up                └──────────────┘
```

- **Desktop** is the source of truth. It pushes a read-only reference payload
  *down*, and pulls records *up*.
- **Phone** caches the reference payload so it works offline, and posts what the
  user recorded.
- **Relay** stores two opaque blobs per pairing and forgets them after a week.
  It has no idea what any of it means.

**The relay is deliberately stupid.** It does no auth beyond the token, no
validation of your domain objects, no merging. Every rule about what the data
means lives in the two apps. This is what keeps it ~120 lines and lets one
worker serve everybody.

---

## 4. The relay

### Contract

Base URL: `https://<your-worker>.workers.dev`

| Method | Path | Who | Meaning |
|---|---|---|---|
| `PUT` | `/channel/:token/down` | desktop | Overwrite the reference payload |
| `GET` | `/channel/:token/down` | phone | Read it (`null` if never written) |
| `POST` | `/channel/:token/up` | phone | Append/replace one record by `id` |
| `GET` | `/channel/:token/up` | desktop | Read all pending records |
| `DELETE` | `/channel/:token/up?id=…` | desktop | Confirm one consumed |
| `DELETE` | `/channel/:token/up` | desktop | Clear the whole box |

KV keys are `down:<token>` and `up:<token>`. **This is the single most important
line in the design**: the mailbox is keyed by *pairing*, not by device and not
globally. Two studios never share a queue, and any number of phones can share
one pairing (a workshop where several people record on their own phones — they
all post to the same box and everything arrives together).

### Rules worth copying

- **TTL on every write** (`expirationTtl`), 7 days. A backstop so an abandoned
  channel disappears without anyone cleaning up.
- **`MAX_PENDING`** (25) — refuse with `409` instead of growing forever. Note
  this cap is *per pairing*, shared by every phone on it.
- **`MAX_BODY_BYTES`** (512 KB) — reject oversized bodies before parsing.
- **`TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/`** — validate before touching KV, so
  a malformed path can't create junk keys.
- **CORS `*`** — the phone app is on a different origin (GitHub Pages) from the
  worker, so preflight has to pass. Handle `OPTIONS`.
- **De-duplicate `up` by `id`**: `[...list.filter(x => x.id !== entry.id), entry]`.
  This is what makes editing a record on the phone and re-syncing *replace*
  rather than duplicate.

### Cloudflare setup (what a user actually does)

1. Free Cloudflare account. No domain, no card.
2. **Storage & Databases → KV → Create instance**, named exactly `KILN_RELAY`
   (whatever you choose, it must match the binding).
3. **Compute → Workers → Create → Hello World**, deploy, then **Edit code**,
   delete everything, paste `relay/worker.js`, deploy.
4. **Settings → Bindings → Add → KV namespace**: variable name `KILN_RELAY`,
   pointing at the namespace from step 2. Save and deploy.
5. The worker's URL is the relay base.

Two things to warn users about, both learned the hard way:

- **Ship a plain-JS build for pasting.** We keep `worker.ts` (typed, commented,
  the real source) and `worker.js` (identical behaviour, no types) precisely
  because the dashboard editor is where people actually paste.
- **Tell them to paste *that* file.** A user asking an AI assistant for "a
  Cloudflare KV worker" gets a generic key-value store that looks right and has
  none of the channel routes, no CORS and no expiry. It fails confusingly.

Free-tier reality: KV allows roughly 1,000 writes/day, which is the binding
limit. A busy pairing does maybe 10–20 writes/day, so one free worker serves
dozens of users. Beyond that it costs cents, not a redesign.

---

## 5. Pairing

### Token

Generated on the desktop, once:

```ts
const bytes = new Uint8Array(18);
crypto.getRandomValues(bytes);
// base64url → 24 chars, matches TOKEN_RE
```

The token *is* the authentication. There is nothing else. That is proportionate
only if the payload is proportionate — see §10.

### QR

The QR encodes the phone app's URL with the pairing in the hash:

```
https://<owner>.github.io/<repo>/#pair=<token>~<encodeURIComponent(relayBase)>
```

**Put the relay address inside the QR.** This is what makes self-hosting free of
friction: a user who switches to their own relay just re-scans, and the phones
follow. Nothing is ever typed on the phone.

Use the `qrcode` package (small, MIT, pure JS) — no service, no image API.

### Adoption on the phone

On first load the phone parses the hash, stores `{token, base}`, and **strips
the hash** (`history.replaceState`) so a refresh doesn't re-parse and the token
isn't left sitting in the address bar.

Two rules in the adopting function:

- If the incoming token **differs** from the stored one, wipe every cached
  domain object first. A new token means a different computer; mixing two
  sources' reference data is worse than starting empty.
- Seed the `down` payload **at pairing time on the desktop**, immediately after
  generating the token. Otherwise the first scan finds an empty mailbox and the
  user has to press sync on both devices, which reads as broken.

### Pairing by code — you will need this

**On iOS, a home-screen web app gets its own storage container, separate from
Safari.** A pairing made in Safari is invisible to the installed app, which
starts up unpaired and mute with no explanation. Android happens to share
storage between browser and installed app, but that's a happy accident, not a
guarantee.

So the pairing must also be carriable by hand:

- Encode as `KL-<base64url(token~relayBase)>`. One opaque blob that survives a
  clipboard round trip and doesn't look like a tappable link.
- **Offer it once, automatically, right after the first scan** — the only moment
  the user is holding both devices. Persist "already offered" *when the sheet is
  shown*, not when pairing succeeds: marking it at pairing time means anything
  that stops the sheet rendering burns the user's only chance of learning the
  code exists.
- Also expose a permanent, quiet **"Have a pairing code?"** entry that accepts
  a paste.
- Accept a pasted pair *link* too. That's what people actually kept.
- Keep the codec **pure and unit-tested**. A silent mangling here strands
  someone with a code that looks right and does nothing.

---

## 6. The phone app (PWA)

### Build

Vite + Svelte + `vite-plugin-pwa`. Its own config, its own root folder, sharing
the pure domain engine with the desktop via an alias:

```ts
export default defineConfig({
  root: "mobile",
  base: process.env.PAGES_BASE || "./",
  resolve: { alias: { "@core": r("src/core/index.ts") } },
  build: { outDir: r("out/mobile"), emptyOutDir: true },
  plugins: [svelte(), VitePWA({
    registerType: "autoUpdate",
    manifest: { name, short_name, start_url: "./", display: "standalone", icons: [...] },
    workbox: { globPatterns: ["**/*.{js,css,html,png,svg,ico}"] },
  })],
});
```

**`PAGES_BASE` is not cosmetic.** On a GitHub Pages *project* site the app is
served from `/<repo>/`. With a relative base the service worker gets an invalid
scope, registration fails, and the app installs but never works offline — while
appearing fine on first visit. Set an absolute base in CI, keep the relative one
for local `vite preview` and LAN testing.

`registerType: "autoUpdate"` gives skipWaiting + clientsClaim, so a push reaches
phones on their next launch with signal. The user never updates anything.

### Storage

`localStorage`, behind a tiny adapter interface so the same UI code can run
against a different backend later. Payloads are small; IndexedDB is not worth
the complexity.

### Deploy

GitHub Pages via Actions, triggered on pushes that touch the mobile folder:

```yaml
- run: npm run build:mobile
  env: { PAGES_BASE: /<repo>/ }
- uses: actions/configure-pages@v5
- uses: actions/upload-pages-artifact@v3
  with: { path: out/mobile }
# then actions/deploy-pages@v4
```

Needs `permissions: {contents: read, pages: write, id-token: write}` and Pages
set to "GitHub Actions" in repo settings.

### Block desktop browsers

The phone app pairs and records; opened on a laptop it's a way to make a mess.
Gate on `matchMedia("(pointer: fine) and (min-width: 900px)")` and show a card
pointing back at the desktop app. Narrow/touch windows still work, so real
phones and on-device testing are never blocked.

---

## 7. The desktop side

### Pushing down

Keep **dirty flags** (`contactsDirty`, `kilnsDirty`) set by the existing edit
paths, and only `PUT /down` when something changed. Cheap, and it keeps the
free-tier write budget for real traffic.

Push **structure, not money**. The phone gets what it needs to build a record
and nothing else. Pricing only ever runs on the desktop.

### Pulling up

On app open (non-blocking) and on demand:

1. `GET /up`
2. Import each record — for us, into the same "current firings" list any
   manually-created one lands in, tagged `source: "phone"` so it's visually
   distinguishable before review.
3. `DELETE /up?id=…` per record, only after it's safely stored.

That delete is the **confirmation round trip**. The phone notices the record has
gone from the relay and only then drops its own copy. Nothing is deleted from
the phone on the strength of "we uploaded it".

### Stable ids

Give each record **one id for its whole life**, generated on the phone, and
upsert by it on the desktop. Editing on the phone and re-syncing then updates
the existing record instead of creating a twin.

**Make the id collision-proof.** Ours was `timestamp + a counter starting at
zero on each device` — two phones creating a record in the same millisecond
produced the *same id*, and the relay's de-duplication silently dropped one.
Add a random component.

### Surface the sync

An import that happens silently reads as a glitch. A small notice — "checking…"
then "2 new, 1 updated" — costs nothing and makes the feature legible.

---

## 8. Self-hosted relays

Put a discreet **Advanced** section at the bottom of the pairing panel:

- One sentence on what the relay is and what passes through it.
- A field for the user's own URL. **Empty = yours.**
- **Verify before accepting.** Write a probe to a throwaway channel and read it
  back:

```ts
const probeToken = `probe${random}`;            // matches TOKEN_RE
await fetch(`${base}/channel/${probeToken}/down`, { method: "PUT", body: JSON.stringify({ probe: stamp }) });
const got = await fetch(`${base}/channel/${probeToken}/down`).then(r => r.json());
ok = got?.probe === stamp;
```

  A URL that merely returns 200 — a parked domain, a proxy, a generic KV
  worker — fails this. Verified in testing against exactly those cases.
- Warn that **switching relays unpairs every phone** (different relay, different
  mailbox) before letting them commit.
- Link to a step-by-step doc.

---

## 9. The gotchas, collected

Every one of these cost real debugging time.

| Symptom | Cause |
|---|---|
| Installs but won't work offline | Relative `base` on a project Pages site → invalid SW scope |
| Installed iOS app is unpaired and mute | iOS gives home-screen web apps their own storage container |
| Two devices' records overwrite each other | Ids colliding; relay de-dupes by id |
| Uploads start failing in a shared setup | `MAX_PENDING` is per *pairing*, not per device |
| Record lost after a trip | Relay TTL expired *and* the phone had already dropped its copy |
| A "working" relay that isn't | Generic KV worker; only a write-then-read probe catches it |
| Settings silently reverting | Two fire-and-forget writes racing; temp-file renames can land in any order — serialise writes per key |

On the TTL: state the window plainly in user-facing docs. A record sent from the
phone dies in the relay after a week, and the phone drops its own copy a day
after sending — past that there is **no copy anywhere**. That is a real way to
lose data and users deserve to know the shape of it.

---

## 10. Privacy, and the limits of this design

What passes through the relay for us: client first names and the geometry of a
load. Never prices, never payment details, never anything about accounts. It
self-deletes after 7 days.

**Be honest about the security model.** The token is a bearer credential
delivered by QR and never typed. Anyone holding it can read and write that
channel. There is no per-request auth, no encryption beyond TLS, no audit trail.
That is proportionate for low-sensitivity operational data with a short life.

**It is not proportionate for personal data, health data, credentials, money, or
anything you'd have to notify a regulator about.** If your payload is in that
territory, this pattern needs at minimum end-to-end encryption with a key
derived from the QR (so the relay holds only ciphertext), and you should think
hard about the seven-day plaintext window before assuming a rewrite of §4 is
enough.

---

## 11. Adapting it

What changes for a different application:

1. **The payload shapes.** `down` = whatever reference data the phone needs to
   compose a record offline. `up` = one record per entry, with a stable `id`.
   Both are opaque to the relay; you do not touch the worker to change them.
2. **The phone UI.** The only part that's genuinely bespoke, and the part worth
   the most iteration.
3. **The import rule on the desktop.** Ours lands records in a review list and
   never auto-merges. Whatever yours is, decide it explicitly.
4. **The caps.** `MAX_PENDING`, `MAX_BODY_BYTES`, TTL, and any per-device limit
   in the phone app (ours holds at most 3 uncollected records, so a lost phone
   is a small loss and the user is nudged to bring them in).

What does not change: the routes, the token scheme, the QR format, the
confirmation round trip, the PWA plumbing, the deploy workflow.

Suggested build order — each stage is independently testable, and this ordering
means the part needing the most design iteration is done first:

1. **Phone UI against a hand-written fixture.** No network at all.
2. **The relay**, tested with `curl` before any UI touches it:
   `PUT down → GET down → POST up ×2 → GET up → DELETE up → GET up empty`.
3. **Wire the phone to the relay.**
4. **Desktop pairing + import.**
5. **Pairing code, advanced settings, polish.**

---

## 12. Files in this repo, for reference

| Path | What it is |
|---|---|
| `relay/worker.ts` | The relay, typed and commented |
| `relay/worker.js` | Same behaviour, for pasting into the dashboard |
| `relay/README.md` | The contract |
| `vite.mobile.config.ts` | PWA build, `PAGES_BASE` handling |
| `.github/workflows/deploy-mobile.yml` | Pages deploy |
| `mobile/src/lib/sync.svelte.ts` | Phone half: pairing, down, up |
| `mobile/src/lib/paircode.ts` | Pairing-code codec (pure, tested) |
| `src/renderer/src/lib/phonesync.svelte.ts` | Desktop half: push, import, relay probe |
| `src/renderer/src/lib/syncconfig.ts` | The two build-time endpoints |
| `src/renderer/src/components/PhonePanel.svelte` | QR, pairing, Advanced |
| `docs/self-hosting-relay.md` | The user-facing Cloudflare walkthrough |
