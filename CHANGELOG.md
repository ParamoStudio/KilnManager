# Changelog

Notable changes, newest first. Dates are release dates.

The desktop app and the phone loader ship differently, and it matters when
reading this: the **phone loader updates itself** (it's a web app served from
GitHub Pages, so every push reaches phones on their next launch with signal),
while the **desktop app is a compiled binary** — you only get a change by
installing a new release from
[Releases](https://github.com/ParamoStudio/KilnManager/releases).

The **relay** is a third thing again: it's a Cloudflare Worker running in *your*
account (or Páramo's). Changes to `relay/worker.js` in this repository do
nothing until someone redeploys it.

---

## v1.0.3 — 22 July 2026

### Fixed: the ticket logos kept disappearing

They vanished after a restart, having seemed to work for a firing or two. Two
faults, both worth fixing on their own:

**Saves were racing.** Saving the ticket panel called a setter that saved on its
own halfway through, starting a write whose snapshot predated the logos, and
then a second write with them. Each write is a temp file plus a rename, and the
renames can complete in either order — so the older snapshot could land last and
quietly undo the newer one. The panel now sets every field and writes once, and
the app serialises writes per file, so the last save always wins. That second
part protects every setting, not just the logos.

**Nothing said when a save failed.** Writes were fire-and-forget: a failure left
the value in memory for the rest of the session and gone after a restart, with
nothing on screen ever having mentioned it. Saves are now checked and reported.

### Logos live in your folder

They're files in `<your data folder>/Brand/` now — one per slot, replaced when
you upload a new one — instead of being buried inside `settings.json` as text
that every unrelated save had to carry around. You can see them, back them up
and swap them without opening the app. Uploading and removing take effect
immediately: what's on screen is what's in the folder.

Any logos still inside `settings.json` are moved across once on startup.

### Partners can take a cut from one client

A guest studio usually brings a person, not a kiln-load, so taking their cut
across the whole firing also took it from clients who had nothing to do with
them. The same tiers now appear twice: **whole firing** works as before, and
**one client only** waits for you to click that client's shelf — the same
gesture the client modifiers use. It's removed from the client's own panel, and
the % badge on a shelf now means "this client has something attached", whether
that's a price modifier or a partner.

A per-client cut comes out of the profit that client produced: their price minus
their share of the kiln's costs, shared by load like everything else here.

### Also

- **Tells you when there's a new version.** On opening, the app compares itself
  against the latest release and shows a quiet line with a download link. Not an
  auto-updater — the builds are unsigned, and swapping your app behind your back
  is not the place to start. Silent when offline, and it remembers a dismissal.
- The data folder's **"Move / new…"** is now **"New…"**, in the accent: moving
  is starting a new folder, and it's the one button there with consequences.
- The Ceramic Lab link works, pointing at its repository until the site is up.

---

## Phone loader — 22 July 2026

Not tied to a desktop release: the phone loader is served from GitHub Pages and
reaches phones on their next launch with signal.

### A pairing code, for when the QR isn't enough

Scanning the QR pairs *the browser that scanned it*. On iPhone that turns out
not to be the browser you end up using: a home-screen web app gets a storage
container of its own, so a pairing made in Safari is invisible to the installed
app, which would start up unpaired and mute with no explanation. (Android
happens to share storage between browser and installed app — a happy accident,
not a guarantee across every vendor.)

So the pairing can now also travel as a code:

- **Offered once**, right after the scan, while you're still holding both
  devices, with a Copy button.
- **Accepted any time** from a permanent *Have a pairing code?* under
  *How it works* — paste and connect.

It carries the relay address too, so self-hosted relays aren't a special case,
and it accepts a pasted pair link as well, since that's what people tend to
have kept. Confirmed working on iPhone: pair in Safari, install to the home
screen, paste the code, done.

### Fixed: the published app offered strangers fake kilns

The developer fixture that loads sample kilns and clients was gated on "not
paired yet" — which is exactly what a first-time user is. Anyone opening the
published app was invited to fill it with fictional data before they had ever
seen a real kiln.

---

## v1.0.2 — 21 July 2026

### Bring your own relay

The phone panel now has a discreet **Advanced** section for pointing Kiln
Manager at your own Cloudflare relay instead of Páramo's. Leave it empty and
nothing changes.

The address is **verified before it's accepted**: the app writes a probe to the
relay and reads it back, so a green tick means it genuinely speaks the protocol
— not merely that the URL resolves. A generic key-value worker will be rejected.

Step-by-step setup in [Running your own relay](docs/self-hosting-relay.md).
Switching relays unpairs every phone, because a different relay is a different
mailbox; the app says so before you commit.

### A whole studio can share one QR

Several people, several phones, one pairing. Every phone posts to the same
mailbox and the firings arrive together on the computer. This already worked by
design — the relay is keyed by pairing, not by device — but two real problems
were in the way:

- **Fixed: two phones could silently destroy each other's work.** Firing ids
  were `timestamp + a counter that starts at zero on each phone`, so two people
  creating a firing in the same millisecond produced the *same id*, and the
  relay's de-duplication would drop one of them without a word. Ids now carry a
  random component.
- **Fixed: the pending limit was shared, not per phone.** Three people filled it
  and uploads started failing. Raised from 5 to 25.

### A tidier phone

The phone now holds at most **3 firings the computer hasn't collected**. Past
that it asks you to bring them in rather than accumulating a backlog it could
lose. Firings already synced don't count — they're receipts waiting to expire,
and there's nothing left to fetch.

If the mailbox is full, uploads stop at the first refusal instead of hammering
the relay, and the phone explains that they're waiting their turn rather than
looking stuck.

### Also

- The **7-day expiry is now stated plainly in the README**. A firing sent from a
  phone dies in the relay after a week, and the phone drops its own copy a day
  after sending — past that window there is no copy anywhere. Worth knowing
  before you go away for a fortnight.
- The Ceramic Lab link points at its own repo. Still hidden until the site is
  actually served — a dead link is worse than no link.
- Git history: 14 commits authored under an old, unused email were reattributed.
  Content is untouched (identical tree hash); only authorship changed.

---

## v1.0.1 — 21 July 2026

**Fixed: the packaged app wouldn't start at all.** It died instantly with
`SIGTRAP` on a clean machine.

The cause was the accent in the bundle name. macOS stores filenames decomposed
(`a` + combining acute) while `Info.plist` carried the composed form, and
Chromium derives its helper-process paths by string comparison — so the helpers
were looked up at a path that, byte for byte, did not exist.

The bundle is now `Paramo Kiln Manager` (ASCII) on disk, while `Páramo Kiln
Manager` remains the name you actually see, via `CFBundleDisplayName`. A second
bug was fixed alongside it: an `identity: null` in the builder config was
skipping the signing pipeline entirely.

---

## v1.0.0 — 21 July 2026 (withdrawn)

First packaged release. Withdrawn the same day: it did not launch. See v1.0.1.

---

## Before v1.0.0

Developed as a private project through seven build phases — the KLU engine and
accounting, the firing dashboard, kiln profiles and pricing, price modifiers,
outputs and client tickets, the live fuel panel, and the phone loader with its
sync bridge. The commit history covers it in detail.
