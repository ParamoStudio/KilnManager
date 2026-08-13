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

## v1.2.0 — 11 August 2026

### A message you can send to whoever collects the money

When you can't be at the studio, a partner charges the students for you — and
until now they were collecting blind. Two copy-to-clipboard reports, in plain
text, ready to paste into WhatsApp.

**Per firing**, in the Partners view: the kiln, the firing type, its full-kiln
price, the date, the total to collect, and what each named client owes — rounded,
and never including your own shelves, which are nobody's to collect. It ends with
what you'll owe the partner from that firing.

```
Horneada · Tecnopiro 75 Gas
Bizcocho — 65,00 € el horno completo
13 de julio de 2026

A cobrar: 31,80 €
- Esther Alumna: 10,60 €
- Ro: 10,60 €
- Marta Alumna: 10,60 €

Os deberé 6,92 € de esta horneada.
```

The message is shown on screen before you copy it, so you can read exactly what
you're about to send.

**Per month**, next to *Reveal in Finder*: the month's gross, what's owed to each
partner, and the net you're reporting.

**Only for a month that's over.** A running total is a promise you haven't
finished making, and a partner reading it as final would be misled — so the
button stays disabled on the current month and says why.

Both are plain text with no formatting characters, since WhatsApp would
reinterpret some of them and anywhere else they'd just show as punctuation.

### Also

- The month name follows the app's language. It was pinned to Spanish, which
  would have put a Spanish month inside an English report.

## v1.1.4 — 11 August 2026

### Partners take a share of what clients pay, not of the firing's profit

1.1.3 stopped partners sharing your losses, but it left the base wrong. A cut was
still worked out from the firing's **profit** — which means the cost of firing
your *own* shelves was eating into what a partner was owed, and on a firing
loaded mostly for yourself it wiped their share out completely.

Your own work has no business in that calculation. It brings nothing in, so it
can't add to a partner's cut — and it must not subtract either. Those shelves are
your affair: stock you'll sell later, not a cost a partner should carry.

A partner's cut is now a share of **what paying clients paid, less the share of
the kiln's costs their part of the load accounts for**. Costs still follow the
load by KLU, so a client who filled a quarter of the kiln carries a quarter of
its costs and no more.

On the reported firing — 16,60 € charged, 18,08 € of costs, of which 4,52 €
belong to the quarter of the kiln that was paying — the partner goes from 0,00 €
to **3,62 €**.

**On a firing with nothing self-assigned, nothing changes**: the whole kiln is
charged, so the base is the gross profit exactly as before. The agreed worked
example in the test suite still produces the same figures.

Per-client partner cuts follow the same rule, from one function, so the two can't
drift apart. The Partners view now says "30% of what clients paid" instead of
"of gross", because that is what it is.

### Fixed: the ledger didn't add up

The expenses breakdown showed what a client actually pays (rounded up) as income
but computed the net from the exact fair-split figure, so the rows on screen were
a few cents from the total underneath them. The monthly views had always used the
invoiced figure; only the firing's own accounting hadn't.

Everything now records what actually came in — which is also what a partner's cut
is taken from, so those can't disagree either. The lines add up.

## v1.1.3 — 11 August 2026

### Fixed: a partner took a share of a firing that lost money

Load a kiln mostly with your own work and the firing runs at a loss by design —
your own pieces occupy it without paying for it. On a firing like that, with one
client paying 6,50 € against 21,75 € of kiln costs, the app gave a 30% partner a
cut of **−4,57 €**.

Negative. So the app was claiming the partner *shares the loss* and owes the
studio money, which quietly made the loss look 4,57 € smaller than it was. Nobody
shook hands on that: a partner agreement is a share of the profit, not a
co-signature on the losses.

A partner's cut can no longer go below zero. If a firing makes nothing, the
partner takes nothing, and the loss is reported at full size. The Partners view
says why it's zero rather than leaving a bare 0,00 € looking like a bug, and a
partner earning nothing no longer appears in your outgoings as "−0,00 €".

This rule already existed for **per-client** partner cuts — added in 1.1.0 — and I
failed to apply it to whole-firing cuts at the same time. Both now go through one
function, so it can't hold in one place and not the other again.

The monthly Expenses viewer and the workbook used their own copy of the same
calculation, so they had the same fault and are fixed with it: a loss-making
month no longer shows a partner owing you money.

---

## v1.1.2 — 11 August 2026

### Fixed: closing a firing produced no invoices and no workbook

A regression I introduced in 1.1.0. Closing a firing appeared to work — it left
the current list, it landed in the log, it showed up in Expenses — but the
outputs panel came up empty and **nothing was written to disk**: no client
invoices, and the month's `.xlsx` never appeared.

The cause was the translation of the built-in cost lines, of all things. The
backfill that guarantees every kiln has "Maintenance reserve" and "Consumables"
compared against the **English** names only. Once those lines were renamed to
the active language, every launch added the English pair back, the translation
pass renamed those to Spanish too, and the kiln ended up with two cost lines
called exactly the same thing. The outputs panel lists them in a keyed loop, a
duplicate key is a hard error in Svelte, so the panel threw while rendering —
and the export that runs when it opens never got to run.

Two launches were needed to trigger it, which is why it appeared out of nowhere
a while after installing.

Fixed at the cause: the backfill recognises a built-in line in any language it
has ever been shown in, and repairs a kiln that already has duplicates (keeping
the one you put a number on). And fixed for good measure where it hurt: those
lists no longer key on a name, because a cost line's name is free text and two
of them being the same should never be able to take a panel down.

Verified against the real vault this was reported from: the panel renders, and a
close writes all three invoices plus the workbook.

**Nothing was lost.** The duplication only ever existed in memory — no kiln file
was corrupted, and the firings themselves saved correctly throughout. Only the
invoices are missing: open an affected firing from the log and its invoices and
figures are written then and there.

---

## v1.1.1 — 31 July 2026

### Rounding is gentler: 20 cents, not 50

Invoices round up to the next **20 cents** now. Still always up, so a rounded
invoice never comes in under what the firing cost — but the step is the most
anyone can be overcharged by, and at 50 cents that could be 49, which stops
being a tidy-up and starts being a surcharge. 10,78 → 10,80. 10,98 → 11,00.

### Fixed: a discount put the unrounded price back on the invoice

An invoice with a discount was still showing computed cent figures — a
`13,47 €` line and a `−2,69 €` line above a rounded total. So the exact price
was visible after all, and the numbers on the page couldn't add up to the total.

A modifier now says what it *is* rather than what it works out to:

```
Coworker Taller · −20%
TOTAL                        10,80 €
```

One money figure on the invoice, as intended. The client can see the discount
they were given, and nothing invites them to check arithmetic that rounding
makes impossible.

### Fixed: the window couldn't be dragged

The app runs without a native title bar, so there was nothing to grab — you
could not move the window. The header is now the drag handle, like any other Mac
app, with its buttons still clickable.

## v1.1.0 — 31 July 2026

### A closed firing can be corrected or deleted

Closing a firing is easy to do by accident, and until now the only way back was
to edit the vault by hand. Open one from the firing log and it offers two
things:

- **Edit** reopens it exactly as it was — shelves, clients, modifiers, partners,
  the lot — so getting one shelf's client wrong doesn't mean rebuilding the
  firing. It's the *same* firing reopened, not a copy, so no duplicate can
  appear and the log doesn't gain a second entry.
- **Delete** removes it for good. Two presses on the button itself, no dialog,
  and it disarms if you walk away.

Both clear what closing produced: the client invoices are deleted from disk and
the expenses workbook is rebuilt without that firing. Anything else would leave
your books disagreeing with the app.

Invoices are removed file by file rather than by folder — two firings in the
same kiln on the same day share a folder, and sweeping it would take the other
firing's invoices with it.

### Electricity is costed properly

Asking for a kWh figure per service was asking for a guess. An electric kiln now
carries the two things that don't change — its **power in kW** and whether its
elements switch by **relay or thyristor** — and each service carries the two that
do: **how many hours** it runs and **how hot** it gets.

From that: `kW × hours × efficiency factor × €/kWh`, where the factor is how
much of the cycle the elements are actually drawing power for. It rises with
temperature (0.40 / 0.55 / 0.75 below 900 °C, to 1150 °C, and above) and a
thyristor is slightly leaner than a relay, because a relay can only be fully on
or off.

Existing electric kilns keep working: they're seeded with a typical studio kiln
and a mid-temperature firing, so fill in your real figures once.

### Reset everything, from inside the app

**App Settings → Reset everything** empties the data folder: kilns, firings,
invoices, the workbook, settings. Two presses, no dialog, no undo. It leaves the
folder valid so the app comes back up empty rather than asking where to live —
and it leaves any file of yours that isn't the app's alone.

### The client invoice

- **Only the first word of a client's name is printed.** Studios keep private
  reminders in a contact's name ("Marta — the tall vases") and that has no
  business on the client's own receipt. A toggle in *Customize Invoice* prints
  the full name if you want it.
- **The date follows the app's language.** It was always English.
- **One price, not two.** The header already names the service and the firing's
  total, so a line repeating it above the total was the same thing twice — and
  the unrounded figure is internal. Modifier lines still appear when there are
  any, since those explain a discount rather than repeat a number.
- **Rounding is now optional.** *App Settings → Invoicing* can turn off the
  round-up to 50 cents; it stays on by default.
- The share of the firing reads as one sentence, with the percentage in a small
  pill instead of a large number.

### Fixed: an edited firing came back as a duplicate

Edit a firing on the phone after it had been closed on the computer and it
arrived as a brand new firing, alongside the one already in your books. The
import was skipping the match on purpose (so as not to overwrite something
invoiced) but the duplicate it created was worse than what it prevented.

Now the computer recognises the id, refuses the stale edit, and tells the phone
the firing is finished so it drops its copy — the phone had no way of knowing
before, since it only ever forgot things on a timer. It says so rather than
having the firing vanish without explanation.

### Also

- The built-in "Maintenance reserve" and "Consumables" cost lines follow the
  app's language, like everything else. Renaming one keeps your name for good.

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
