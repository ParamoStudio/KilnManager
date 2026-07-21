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
