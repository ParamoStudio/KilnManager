/**
 * English string dictionary — the base language and the source of truth for
 * every other translation. One nested namespace per component/route (matching
 * the file it was extracted from), so a translator can work file-by-file.
 *
 * Plain strings for static text; arrow functions for anything with a variable,
 * a count, or pluralization baked in (so a translator gets the whole sentence,
 * not fragments to reassemble).
 *
 * NOT included here (by design — these are the app's own brand, not UI copy):
 * "PÁRAMO", "KILN MANAGER" wordmark/title.
 *
 * Also NOT included (tracked separately, see i18n/README notes in the mapping
 * report): number/date/currency formatting locales in lib/format.ts and a
 * couple of inline `toLocaleDateString("es-ES", …)` calls — those need to
 * become locale-driven rather than hardcoded once the language selector lands.
 */

export const en = {
  common: {
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    remove: "Remove",
  },

  // ---- App.svelte -----------------------------------------------------------
  app: {
    tabHome: "Home",
    tabExpenses: "Expenses",
    tabKilnProfiles: "Kiln Profiles",
    tabAppSettings: "App Settings",
    backToHome: "← Home",
    clientBook: "Client Book",
    clientBookShortcut: "Client Book (A)",
    github: "GitHub",
    shop: "Shop",
    ceramicLabTools: "Ceramic Lab Tools",
    comingSoon: "Coming soon",
    kofiText: "This program is open source and free to use. Enjoying it?",
    kofiLink: "Support me if you feel like it",
    dismiss: "Dismiss",
  },

  // ---- AgendaCard.svelte (the "Client Book" modal) --------------------------
  agenda: {
    title: "Client Book",
    exportCsv: "Export CSV",
    exportCsvTitle: "Export the agenda as a CSV file",
    newClient: "+ New client",
    noClientsYet: "No clients yet.",
    fieldName: "Name",
    fieldNamePlaceholder: "First name",
    fieldSurname: "Surname",
    fieldSurnamePlaceholder: "Surname",
    fieldPhone: "Phone",
    fieldPhonePlaceholder: "Phone",
    fieldNotes: "Notes",
    fieldNotesPlaceholder: "Notes about this client",
    confirmDelete: "Confirm delete",
    delete: "Delete",
    save: "Save",
    addClient: "Add client",
  },

  // ---- VaultOnboarding.svelte ------------------------------------------------
  vaultOnboarding: {
    ariaLabel: "Choose data folder",
    newTitle: "Your data, in your folder",
    newBody:
      "Páramo Kiln Manager keeps everything as plain <b>JSON files</b> in a folder <b>you</b> choose — open it in Finder, back it up, sync it, move it. The app is just the viewer.",
    newHint:
      "Pick an empty folder (or make a new one). We'll drop a small marker file inside so the app recognises it later.",
    chooseFolder: "Choose folder…",
    lostTitle: "Data folder not found",
    lostBody: "The folder with your Páramo data was moved, renamed, or deleted. Locate it again, or start a fresh one.",
    locateIt: "Locate it…",
    createNew: "Create new…",
    errorNotAVault: "That folder isn't a Páramo data folder. Pick the one that holds your data, or create a new one.",
    errorGeneric: "Couldn't set that folder. Try again.",
  },

  // ---- FirstKilnPrompt.svelte -------------------------------------------------
  firstKilnPrompt: {
    ariaLabel: "Add your first kiln",
    title: "Add your first kiln",
    body: "Add your first kiln to start monitoring your firings! Just click continue and fill in the relevant data.",
    continue: "Continue",
    later: "Later",
  },

  // ---- Home.svelte ------------------------------------------------------------
  home: {
    currentFirings: "Current firings",
    noFiringsInProgress: "No firings in progress. Start one →",
    pending: "pending",
    deleteFiring: "Delete firing",
    clickAgainToDelete: "Click again to delete",
    clients: (n: number) => `${n} client${n === 1 ? "" : "s"}`,
    startNewFiring: "Start new firing",
    chooseAKiln: "Choose a kiln",
    cancel: "Cancel",
    firingLog: "Firing log",
    closedFiringsWillAppear: "Closed firings will appear here.",
    viewExpenses: "View Expenses",
    monthDaysLeft: (n: number) => (n === 0 ? "last day" : `${n} days left`),
    monthNet: "net",
    monthFirings: (n: number) => `${n} ${n === 1 ? "firing" : "firings"}`,
    monthBilled: "billed",
  },

  // ---- KilnProfiles.svelte ------------------------------------------------------
  kilnProfiles: {
    title: "Kiln Profiles",
    subtitle: "Your kilns. Prices and costs are per kiln — you don't charge every kiln the same.",
    newKiln: "New kiln",
    allKilns: "← All kilns",
    deleteKiln: "Delete kiln",
    deleteConfirm: (name: string) => `Delete "${name}" — confirm?`,
    properties: "Properties",
    fieldName: "Name",
    fieldLocation: "Location",
    fieldLocationOptional: "optional",
    fieldLocationPlaceholder: "e.g. Back studio",
    energy: "Energy",
    energyElectric: "Electric",
    energyGas: "Gas",
    energyWood: "Wood",
    energyOther: "Other",
    gasPropane: "Propane",
    gasButane: "Butane",
    shape: "Shape",
    shapeCylinder: "Cylinder",
    shapeBox: "Box",
    diameterCm: "Diameter (cm)",
    widthCm: "Width (cm)",
    depthCm: "Depth (cm)",
    usableHeightCm: "Usable height (cm)",
    loadableVolume: "Loadable volume",
    shelfThicknessCm: "Shelf thickness (cm)",
    standardPostHeights: "Standard post heights",
    removePost: "Remove post",
    addPost: "Add post",
    pricingAndCosts: "Pricing & costs",
    services: "Services",
    servicesHint: "price + fuel used per firing",
    fuelNote: (fuelLabel: string, price: string, unit: string) =>
      `Fuel: <b>${fuelLabel}</b> · ${price}/${unit} — update in Home / App Settings. Cost = fuel used × this price.`,
    tableService: "Service",
    tablePrice: "Price",
    tableFuel: (unit: string) => `Fuel (${unit})`,
    tableFuelCost: "= fuel",
    addService: "+ Add service",
    removeService: "Remove",
    fixedCosts: "Fixed costs",
    fixedCostsHint: "flat per firing — internal margin only",
    addFixedCost: "+ Add fixed cost",
    removeCost: "Remove",
    priceModifiers: "Price modifiers",
    priceModifiersHint: "surcharges & discounts · full-kiln or per-client",
    kilnPriceModifiers: "Kiln Price Modifiers",
  },

  // ---- KilnModifiersPanel.svelte ------------------------------------------------
  kilnModifiers: {
    ariaLabel: "Kiln price modifiers",
    title: "Kiln Price Modifiers",
    surcharges: "Surcharges",
    discounts: "Discounts",
    fullKilnModifier: "Full Kiln Modifier",
    clientModifier: "Client Modifier",
    noneYet: "None yet.",
    addSurcharge: "+ Add surcharge",
    addDiscount: "+ Add discount",
    removeModifier: "Remove",
  },

  // ---- FuelPricePanel.svelte ------------------------------------------------------
  fuelPanel: {
    title: "Fuel control",
    logHeader: "Log what you last paid — updates every kiln on that fuel",
    justPaidPlaceholder: "just paid…",
    save: "Save",
    marketReferenceLive: "Market reference · live",
    refresh: "Refresh",
    electricityWholesale: "Electricity · wholesale",
    loading: "Loading…",
    kwhNow: "€/kWh now",
    dayAvg: (avg: string, when: string, source: string) => `Day avg ${avg} · ${when} · ${source}`,
    wholesaleCaveat: "Wholesale — retail adds taxes & fees; check your bill.",
    referenceUnavailable: "Reference unavailable right now.",
    bottleEstimate: "Bottle estimate",
    yours: "yours",
    marketRef: (approxTilde: string, value: string, region: string, asOf: string, approxSuffix: string) =>
      `Market ref · ${approxTilde}${value} €/kg · ${region} ${asOf}${approxSuffix}`,
    approxSuffix: " · approx",
    bottleCaveat: `"Yours" = what you paid. Market ref is orientative — check your supplier.`,
    noLiveReferences: "No live references for your fuels (wood prices are local — enter what you pay).",
  },

  // ---- AppSettings.svelte ------------------------------------------------------
  appSettings: {
    title: "App Settings",
    subtitle: "Studio-wide settings. Kiln-specific prices and costs live in Kiln Profiles.",
    complexityFactors: "Complexity factors",
    complexityExplain:
      "Every piece counts as its shelf volume <b>×</b> its complexity factor — that's its <b>KLU</b> (kiln-load unit). A firing's price is split across everyone by their share of the total KLU, so a trickier load fairly carries a bit more.",
    resetDefaults: "Reset to defaults (1.00 / 1.15 / 1.30)",
    fuelPrices: "Fuel prices",
    fuelPricesExplain:
      "The volatile part of each firing's cost. Set the current price per unit; it multiplies each service's fuel use. You can also update these quickly from Home when you buy.",
    electricityPricing: "Electricity pricing",
    electricityExplain:
      "Adaptive tariffs change through the day, so we can't be exact — pick how you price it. The result feeds every electric kiln. For the truest figure, take it from your bill.",
    fixed: "Fixed",
    adaptiveAverage: "Adaptive average",
    low: "Low",
    high: "High",
    fixedHint: "Set the €/kWh directly in the fuel table above (from your bill).",
    dataFolder: "Data folder",
    dataFolderExplain: "Everything is stored as plain JSON files here — yours to open, back up, or move.",
    revealInFinder: "Reveal in Finder",
    locateExisting: "Locate existing…",
    moveOrNew: "Move / new…",
    partners: "Partners",
    partnersExplain:
      "Collaborators who take an agreed cut of the gross profit, each with named tiers (e.g. their client vs. your client). Shown only in your internal breakdown. Mark a tier with ★ to apply it by default on every new firing (uncheck it per firing if needed).",
    removePartner: "Remove partner",
    removeTier: "Remove tier",
    starTitle: "Apply by default on new firings",
    noTiersYet: "No tiers yet.",
    addTier: "+ Add tier",
    noPartnersYet: "No partners yet.",
    addPartner: "+ Add partner",
    clientTicket: "Client ticket",
    clientTicketExplain:
      "Your logos, workshop name, a printed note and the message you send — with a live preview of the ticket your clients receive.",
    customizeClientTicket: "Customize Client Ticket…",
  },

  // ---- CustomizeTicket.svelte ------------------------------------------------
  customizeTicket: {
    ariaLabel: "Customize client ticket",
    title: "Customize Client Ticket",
    subtitle: "What your clients receive. Everything here is optional but logos and a note make it yours.",
    workshopName: "Workshop / studio name",
    workshopNamePlaceholder: "My Studio",
    workshopNameHint: "Where you fire — e.g. a communal or shared workshop.",
    logoTop: "Logo — top of ticket",
    logoTopHint: "Recommended. PNG or SVG with transparent background.",
    logoBottom: "Logo — footer",
    logoBottomHint: "Optional — a small emblem/stamp for the bottom.",
    upload: "Upload…",
    remove: "Remove",
    noteLabel: "Note printed on the ticket",
    notePlaceholder: "e.g. Handle glazed pieces with care for 24h.",
    noteHint: "Replaces the default “Thank you for trusting …” line. Leave empty to keep the default.",
    messageLabel: "Message you send with the ticket",
    messageHint: (client: string, total: string) => `Use <b>${client}</b> and <b>${total}</b> as placeholders.`,
    imageTooLarge: "That image is large (>1.5 MB) — a smaller PNG/SVG keeps the file light.",
    save: "Save",
    cancel: "Cancel",
    livePreview: "Live preview",
    previewClient: "Sample client",
    previewFiringTotalLine: (studio: string) => `Thank you for trusting ${studio} with your pieces.`,
  },

  // ---- Expenses.svelte ------------------------------------------------------
  // NOTE: this route is currently hardcoded in SPANISH in the app (a leftover
  // from before the English-baseline decision). English strings below are the
  // correct baseline this route should be rewritten to use.
  expenses: {
    title: "Expenses",
    subtitle:
      "Costs for each kiln, month by month — read from your closed firings. Every month is saved as its own <code>.xlsx</code> in the <code>Expenses Log</code> folder, updated on every firing.",
    revealInFinder: "Reveal in Finder",
    noFiringsClosed: "No firings closed yet.",
    noFiringsClosedHint: "Once you close a firing, its costs will show up here.",
    revenue: "Revenue",
    costs: "Costs",
    gross: "Gross",
    net: "Net",
    youOweThisMonth: "You owe this month",
    markPaid: "Mark as paid",
    unmarkConfirm: "Mark as pending?",
    yes: "Yes",
    no: "No",
    paidOn: (date: string) => `Paid · ${date}`,
    undo: "Undo",
    firing: "Firing",
    totalThisMonth: "Total this month",
  },

  // ---- OutputsPanel.svelte ------------------------------------------------------
  outputsPanel: {
    ariaLabel: "Firing outputs",
    close: "Close",
    navFiring: "Firing",
    navClients: "Clients",
    navPartners: "Partners",
    navExpenses: "Expenses",
    sendTickets: "Send Tickets",
    firingBreakdown: "Firing breakdown",
    price: "Price",
    base: (serviceName: string) => `Base · ${serviceName}`,
    customDiscount: "Custom discount",
    firingPrice: "Firing price",
    occupancy: "Occupancy",
    loaded: "loaded",
    yourCosts: "Your costs",
    fuelLine: (label: string, use: number, unit: string, price: string) => `${label} · ${use} ${unit} × ${price}`,
    kilnCosts: "Kiln costs",
    result: "Result",
    collected: "Collected",
    exact: (v: string) => `exact ${v}`,
    minusKilnCosts: "− Kiln costs",
    grossProfit: "Gross profit",
    minusPartners: "− Partners",
    netToYou: "Net to you",
    clientsTitle: "Clients",
    tableClient: "Client",
    tableKlu: "KLU",
    tableShare: "Share",
    tableCharge: "Charge",
    own: "own",
    totalCollected: "Total collected",
    partnersTitle: "Partners",
    ofGross: (pct: string) => `${pct} of gross`,
    toPartners: "To partners",
    noPartnersOnFiring: "No partners on this firing.",
    expensesTitle: "Expenses · in & out",
    collectedIn: "Collected (in)",
    fuelOut: (label: string) => `Fuel — ${label}`,
    partnerOut: (name: string) => `Partner · ${name}`,
    clientTicketTitle: "Client ticket",
    noChargedClients: "No charged clients on this firing.",
    openPdf: "Open PDF",
    share: "Share…",
    copyMessage: "Copy message",
    messageCopied: "Message copied ✓",
    revealInFinder: "Reveal in Finder",
    desktopOnly: "Desktop only",
    openPdfDesktopOnly: "Opening the PDF is desktop-only.",
  },

  // ---- FiringPlanner.svelte ------------------------------------------------------
  firingPlanner: {
    pickBanner: (modName: string) => `Pick an assigned shelf to apply: ${modName} to that client`,
    cancel: "Cancel",
  },

  // ---- StructurePanel.svelte ------------------------------------------------------
  structurePanel: {
    firing: "Firing",
    titlePlaceholder: "Untitled firing",
    kilnSummary: (kilnName: string, dims: string, height: string) => `${kilnName} · ${dims} · ${height}`,
    firingService: "Firing service",
    priceModifiers: "Price Modifiers",
    kilnModifier: "Kiln Modifier",
    noneDefinedForKiln: "None defined for this kiln.",
    customDiscount: "Custom discount",
    apply: "Apply",
    clear: "Clear",
    clientModifier: "Client Modifier",
    clickShelfToApply: "Click a client's shelf in the kiln to apply.",
    partners: "Partners",
    noTiers: "No tiers",
    noPartnersAddInSettings: "No partners — add them in App Settings.",
    confirmClose: "Click again to confirm — closes the firing",
    confirmFiring: "Confirm firing & invoice",
  },

  // ---- AssignPanel.svelte ------------------------------------------------------
  assignPanel: {
    title: "Assign",
    hintNoSelection: "Click shelves in the kiln to select them. Click a client's shelf to edit all of theirs.",
    shelvesCount: (n: number) => `${n} ${n === 1 ? "shelf" : "shelves"}`,
    assignToAnotherClient: "Assign to another client ▾",
    assignToAnotherClientOpen: "Assign to another client ▴",
    moveTo: (name: string) => `Move to ${name}`,
    onlySelected: (label: string) => `Only selected ${label}`,
    moveAllOfTo: (owner: string, target: string) => `Move all of ${owner} to ${target}`,
    back: "← back",
    searchClientsPlaceholder: "Search clients…",
    newClient: "+ New client",
    assignToMyself: "Assign to myself",
    complexityPerZone: "Complexity per zone",
    modifiersFor: (owner: string) => `Modifiers · ${owner}`,
    removeModifier: "Remove modifier",
    noteFor: (owner: string) => `Note · ${owner}`,
    notePlaceholder: "Optional note for this firing",
    emptySelection: (label: string) => `Empty selection (${label})`,
    emptyAllOf: (owner: string) => `Empty all of ${owner}`,
    shelvesSelected: (n: number) => `${n} ${n === 1 ? "shelf" : "shelves"} selected`,
    currentlyFree: "Currently free",
    complexity: "Complexity",
    assignTo: "Assign to",
    noMatch: "No match.",
  },

  // ---- ShelfEditor.svelte ------------------------------------------------------
  shelfEditor: {
    addShelf: "Add shelf",
    editShelf: "Edit shelf",
    close: "Close",
    shelfHeight: "Shelf height",
    stackTitle: "Stack several posts (e.g. 8 + 5)",
    clearTitle: "Clear / collapse",
    reservedPosts: (postsSum: string, support: number, thickness: number) =>
      `${postsSum} posts ${support} + shelf ${thickness}`,
    custom: "Custom",
    fillKiln: "Fill kiln",
    fillKilnTitle: "Reserve all remaining height (last shelf / tall piece)",
    cm: "cm",
    add: "Add",
    set: "Set",
    splitShelf: "Split shelf",
    splitFull: "Full",
    redivideWarning: "Re-dividing clears this shelf's clients.",
    done: "Done",
    totalCm: (n: number) => `${n} cm total`,
  },

  // ---- CapacityStrip.svelte ------------------------------------------------------
  capacityStrip: {
    clientBreakdown: "Client breakdown",
    noClientsYet: "No clients assigned yet — select zones and assign them.",
    selectZonesTitle: "Select this client's zones",
    own: "own",
  },

  // ---- PriceSummary.svelte ------------------------------------------------------
  priceSummary: {
    base: (serviceName: string) => `Base · ${serviceName}`,
    customDiscount: "Custom discount",
    clientModifiers: "Client modifiers",
    applied: "applied",
    occupancy: "Occupancy",
    loaded: "loaded",
    totalFiring: "Total firing",
  },

  // ---- KilnSvg.svelte (in-kiln SVG labels) ---------------------------------------
  kilnSvg: {
    usableDiameter: "USABLE DIAMETER",
    usableHeight: "USABLE H.",
    addShelf: "+ Add shelf",
    remainingParen: (cm: string) => `(${cm} cm remaining)`,
    remaining: (cm: string) => `${cm} cm remaining`,
    full: "FULL",
  },

  // ---- ticket.ts (the client-facing PDF/receipt) ---------------------------------
  // Kept as its own namespace: this is what CLIENTS see, and per the roadmap its
  // language may end up independently configurable from the app's own chrome.
  ticket: {
    heading: "FIRING TICKET",
    client: "Client",
    date: "Date",
    firingType: "Firing type",
    firingTotal: "Firing total",
    total: "TOTAL",
    yourPiecesFilled: "Your pieces filled", // followed by the bold X% then ofThisFiring
    ofThisFiring: "of this firing.",
    defaultThanks: (studio: string) => `Thank you for trusting ${studio} with your pieces.`,
    defaultMessage: (client: string) =>
      `Hi ${client}! Your pieces are in the kiln — they'll be ready to pick up in about a day. I've attached your ticket. See you!`,
  },

  // ---- Seed / default data ---------------------------------------------------
  // First-run defaults the user is expected to rename — still worth localizing
  // since they're what a brand-new user sees before they touch anything.
  defaults: {
    complexitySimple: "Simple",
    complexityMedium: "Medium",
    complexityComplex: "Complex",
    newKiln: "New kiln",
    firingService: "Firing",
    maintenanceReserve: "Maintenance reserve",
    consumables: "Consumables",
    newSurcharge: "New surcharge",
    newDiscount: "New discount",
    newService: "New service",
    newCost: "New cost",
    newPartner: "New partner",
    tier: "Tier",
    exampleGuestStudio: "Example Guest Studio",
    theirClient: "Their client",
    myClient: "My client",
    fuelElectricity: "Electricity",
    fuelPropane: "Propane",
    fuelButane: "Butane",
    fuelWood: "Wood",
    fuelOther: "Fuel",
  },
};

export type Dictionary = typeof en;
