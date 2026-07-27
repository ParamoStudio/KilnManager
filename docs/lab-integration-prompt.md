# Master prompt — integrating Kiln Manager into Páramo Ceramic Lab

You are integrating a tool called **Kiln Manager** into the Páramo Ceramic Lab
website (an aggregator of ceramic tools). This document is the brief. Read it
fully before touching anything.

## What you're being given

Three things, from the Kiln Manager repository:

1. **`out/lab/`** — the built tool. A static folder: `index.html` and an
   `assets/` directory. This is the artifact you deploy. Do not edit files
   inside it (see "How to make changes" below).
2. **`docs/lab-theme.css`** — a single stylesheet that restyles the entire
   tool via CSS custom properties. This is how you match it to the Lab's look.
3. **`docs/lab-handoff.md`** — the detailed integration reference: mount
   options, storage caveats, the export, and a table of things that look like
   bugs but aren't. **Read it. This prompt summarises; that file is the source
   of truth for the mechanics.**

## What the tool is

The free web build of Kiln Manager, a desktop app that prices ceramic kiln
firings. It is the real application with the parts that need a real computer
removed — same calculation engine, so the numbers it produces match the app's.
Both are open source (AGPL) and free. The web version exists so the tool can be
*used*, not merely advertised, and so the site doesn't host a second, diverging
copy of it.

## Your job, in order

1. **Deploy `out/lab/` as a tool page.** It's static, uses relative paths, has
   no router, and makes zero network requests. It drops into any subpath and
   works with no server rewrites. Wire up the tool card (the one already sitting
   as a "Kiln Cost Manager · PLANNED" placeholder) to open it.
2. **Provide a "Return to tools" affordance** in your shell — the same floating
   pill the other tools use. The tool has no back button of its own; on the
   desktop it *is* the window. Keep the pill above `z-index: 81` so it stays
   over the tool's modals.
3. **Apply `lab-theme.css`** after the tool's own stylesheet to match the Lab's
   monochrome look. Edit the variables in that file; don't touch components.
   One caveat, explained in the file: inside the kiln, client identity is shown
   *by colour*, and that's information, not decoration — going fully greyscale
   there stops being legible past three or four clients. The recommendation is a
   monochrome interface with the kiln keeping desaturated colour.

## Things that will bite you if you skip the handoff

- **Shared `localStorage`.** Every tool on the site shares one origin, so one
  `localStorage`. This tool's keys are prefixed `kiln:`. Keep that prefix clear
  of other tools, and make sure nothing on the site ever calls
  `localStorage.clear()` — it would wipe this tool's data too.
- **Iframe downloads.** If you embed via iframe (valid, but you lose theming
  from the host page), the sandbox attribute MUST include `allow-downloads`, or
  the "Download this firing" export fails silently.
- **Wide viewport.** It's a desktop-shaped, three-column tool. It renders below
  ~900 px but gets cramped; if the Lab needs a mobile story here, the honest one
  is a line saying the tool wants a bigger screen.

## Already built into the tool (do not rebuild these)

Two pieces the owner specifically wanted are already implemented in this build —
you do not need to add them, only leave them working:

### 1. A permanent "Download app" button

Top-right of the tool's own header, always visible: **↓ Download app**. It opens
the desktop app's release page. It's the tool's single, quiet piece of
advertising — please don't add more; the tool earns the download by being
useful and the Lab site already says who made it. The URL is one constant
(`APP_URL` in `src/renderer/src/lib/lab.ts`) if you ever want it to point at a
Lab page instead of GitHub Releases.

### 2. A one-time welcome card

On a visitor's first run, a floating card appears once (a flag in
`localStorage`, key `kiln:labWelcomeSeen`, remembers it). It is minimal and
iconned, not a wall of text: a title, one short paragraph, a two-column grid of
six iconned features the desktop app adds (phone loading, client book, unlimited
kilns & firings, full firing log, expenses to Excel, everything local), an
honest privacy note, and two actions — **Continue** (try the tool) and
**Download the app** — plus a "See the source on GitHub" link. It's the
`LabWelcome.svelte` component; its copy lives in the `labWelcome` block of the
i18n dictionaries (English and Spanish).

Its message, for reference:

> **What is Kiln Manager?** A lightweight tool for keeping control of what your
> studio's kiln firings cost, and for making the firing service you offer
> students and clients easier to run and to document. This is the free web
> version — try it, or use it for the odd firing, right here.
>
> *The desktop app also has:* phone pairing · client book · unlimited kilns &
> firings · full firing log · expenses to Excel · everything on your computer.
>
> Everything lives on your own machine. No data goes to anyone else — ever. It's
> open source, so you can read every line on GitHub and even build it yourself.

If you deploy behind a shell that already introduces each tool, and a second
intro card would be redundant, you may suppress it — but leave the permanent
Download button regardless.

## The limits, so you can describe the tool accurately

One kiln · two firings at once · five in the firing log. A finished firing
downloads as a zip of client invoices plus a spreadsheet of its figures. No
client book (you name clients per firing; the names don't persist), no phone
loading, no live fuel prices, no data folder. None of these exist to nag someone
into paying — everything is free — they exist because a browser's storage can be
cleared without warning and is no place for an archive. Nothing is ever deleted
silently: reaching the log limit asks the user to export or discard the oldest
firing before continuing.

## How to make changes

Do **not** patch `out/lab/`. It's generated. If something needs changing — a
label, a limit, a colour the theme file can't reach, the welcome copy — request
it against the Kiln Manager source, where it's a one-flag build
(`npm run build:lab`). That way the next update doesn't silently undo your
change. Updating the tool later is then a straight folder swap: same mount
point, same `kiln:` storage keys, same theme variables.
