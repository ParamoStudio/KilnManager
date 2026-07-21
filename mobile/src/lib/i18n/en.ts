/**
 * English dictionary for the mobile companion. Small and scoped to its own
 * screens (not a copy of the desktop app's dictionary — most of that doesn't
 * apply here, since the phone never shows prices or does desktop-only things).
 */
export const en = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    close: "Close",
    back: "← Back",
    confirmDelete: "Delete this?",
    yes: "Yes",
    no: "No",
  },

  nav: {
    drafts: "My drafts",
    newFiring: "+ New firing",
  },

  drafts: {
    title: "My drafts",
    subtitle: "Your firings in progress.",
    empty: "No drafts yet.",
    emptyHint: "Load a kiln to start one.",
    resume: "Resume",
    shelvesCount: (n: number) => `${n} ${n === 1 ? "shelf" : "shelves"}`,
    clientsCount: (n: number) => `${n} ${n === 1 ? "client" : "clients"}`,
    unassigned: "unassigned",
    capReached: (n: number) =>
      `${n} firings waiting here. Open Kiln Manager on your computer to bring them in, then you can start another.`,
    mailboxFull:
      "The computer hasn't collected the last batch yet, so these are waiting their turn. Open Kiln Manager and they'll go through.",
    statusDraft: "Draft",
    statusSynced: "Synced",
    autoDeleteHint: "auto-deletes in a day",
    deleteSynced: "Clear synced",
    syncNow: "Upload manually",
    syncing: "Uploading…",
    lastSync: (time: string) => `Uploads automatically · last ${time}`,
    syncError: "Couldn't upload — will retry when you're back online",
  },

  loader: {
    pickKiln: "Pick a kiln",
    pickService: "Firing type",
    kilnSummary: (dims: string, height: string) => `${dims} · ${height}`,
    addShelf: "+ Add shelf",
    editShelf: "Edit shelf",
    shelfHeight: "Shelf height",
    custom: "Custom",
    fillKiln: "Fill kiln",
    stackPosts: "Stack posts",
    add: "Add",
    set: "Set",
    cm: "cm",
    postsShelf: (post: string, shelf: string) => `posts ${post} + shelf ${shelf}`,
    totalCm: (cm: string) => `${cm} cm total`,
    splitShelf: "Split shelf",
    splitFull: "Full",
    done: "Done",
    removeShelf: "Remove",
    firingTitlePlaceholder: "Untitled firing",
    saveDraft: "Save draft",
    myself: "Myself",
    complexitySimple: "Simple",
    complexityMedium: "Medium",
    complexityComplex: "Complex",
  },

  kiln: {
    usableDiameter: "Usable diameter",
    usableSize: "Usable size",
    usableHeight: "Height",
    full: "Full",
    remaining: (cm: string) => `${cm} cm left`,
  },

  assign: {
    assignTitle: "Assign to client",
    editTitle: "Edit assignment",
    tapHint: "Tap a slot in the kiln to select it.",
    shelvesSelected: (n: number) => `${n} ${n === 1 ? "shelf" : "shelves"} selected`,
    shelvesCount: (n: number) => `${n} ${n === 1 ? "shelf" : "shelves"}`,
    currentlyFree: "Currently free",
    assignSelection: (n: number) => `Assign selection (${n})`,
    complexity: "Complexity",
    complexityPerZone: "Complexity per zone",
    complexityHelp: "What each level means",
    complexityHelpSimple: "Simple — a normal load.",
    complexityHelpMedium: "Medium — more time or more fragile (simple jewellery, small pieces, somewhat fragile sculpture).",
    complexityHelpComplex: "Complex — more time and more fragile (e.g. fine jewellery, or huge sculpture loads).",
    assignTo: "Assign to",
    searchClientsPlaceholder: "Search clients…",
    assignToMyself: "Assign to myself",
    noMatch: "No match.",
    note: "Optional note",
    notePlaceholder: "Optional note for this firing",
    reassign: "Assign to another client",
    moveTo: (name: string) => `Move to ${name}`,
    onlyThis: (label: string) => `Only this one (${label})`,
    moveAllOf: (owner: string, name: string) => `Move all of ${owner} to ${name}`,
    emptyZone: (label: string) => `Empty ${label}`,
    emptyAllOf: (owner: string) => `Empty all of ${owner}`,
  },

  home: {
    howItWorks: "How it works",
    sync: "Sync",
    infoTitle: "How it works",
    infoBody:
      "Load your kilns here in the studio — pick a kiln, build the shelves and assign each slot to a client. Drafts are saved automatically. Later you sync with your computer to finish pricing and invoicing there.",
    syncTitle: "Sync with your computer",
    syncBody:
      "This phone isn't paired yet. On the computer, open Kiln Manager → Settings → “Load Kiln with Phone” and scan the QR code once. After that, “Sync now” sends your drafts to the computer and pulls in your latest kilns and clients — no accounts.",
    notPaired: "Not paired",
  },


  fixture: {
    seedButton: "Load sample kilns & clients (dev)",
    seeded: "Sample data loaded.",
  },
};

export type Dictionary = typeof en;
