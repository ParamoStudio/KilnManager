/**
 * Lab mode — the free, distilled build that runs inside Páramo Ceramic Lab.
 *
 * Same source as the desktop app, built with VITE_LAB=1. It is deliberately a
 * build flag and not a fork: a copy would drift within weeks, and the whole
 * point of the web version is that it *is* the app, in miniature, so the
 * numbers it produces match what the app would produce.
 *
 * The shape of the limit matters more than its size. Nothing here is meant to
 * annoy someone into paying (it's all free anyway) — it's meant to be honestly
 * useful for a small studio while making the desktop app's job obvious:
 * several kilns, a client book, an unbroken history, and data in your own
 * folder rather than in a browser that can clear itself.
 */
export const LAB = import.meta.env.VITE_LAB === "1";

/** Where lab users go to get the real thing. */
export const APP_URL = "https://github.com/ParamoStudio/KilnManager/releases/latest";

/** Kilns you can define. One is plenty to price a studio's own firings. */
export const LAB_MAX_KILNS = 1;

/** Firings open at once. */
export const LAB_MAX_CURRENT = 2;

/**
 * Closed firings kept before you have to deal with the oldest. Small on
 * purpose: a browser's storage is not a place to build an archive, and a short
 * list keeps that honest instead of pretending otherwise.
 */
export const LAB_MAX_LOG = 5;
