/**
 * Phone-bridge endpoints — configured ONCE here, for everyone.
 *
 * The studio using this app never types these: they install, hit "Connect
 * phone", and scan the QR. Páramo runs a single relay for all users; each
 * pairing is isolated by its own long random token, and the relay only ever
 * holds client first names + firing structure (no prices), auto-expiring after
 * 7 days.
 *
 * Self-hosting: this is open source — deploy relay/worker.ts to your own
 * Cloudflare account (see relay/README.md) and point RELAY_BASE at it.
 */

/** The Cloudflare Worker relay (no trailing slash). */
export const RELAY_BASE = "https://kiln-relay.paramoyermo.workers.dev";

/** Where the phone PWA is published (GitHub Pages), no trailing slash. */
export const MOBILE_APP_URL = "https://paramostudio.github.io/KilnManager";

/** Both endpoints configured? Until then the phone bridge stays hidden. */
export const bridgeConfigured = (): boolean => !!(RELAY_BASE && MOBILE_APP_URL);
