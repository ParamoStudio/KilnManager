/**
 * Tiny standalone "unsent changes" flags for phone sync. Kept in its own module
 * (importing nothing) so the contact/kiln edit paths and the phone-sync module
 * can all touch it without creating an import cycle. Set on any edit that the
 * phone should eventually see; cleared once a `PUT /down` succeeds.
 */
export const syncDirty = $state<{ contacts: boolean; kilns: boolean }>({
  contacts: false,
  kilns: false,
});

/** The phone-sync module registers here so a new/edited client or kiln is
 * pushed to the phone right away, instead of waiting for the next app launch.
 * A hook (rather than an import) keeps this module dependency-free. */
let hook: (() => void) | null = null;
export function setDirtyHook(fn: (() => void) | null): void {
  hook = fn;
}

export function markContactsDirty(): void {
  syncDirty.contacts = true;
  hook?.();
}
export function markKilnsDirty(): void {
  syncDirty.kilns = true;
  hook?.();
}
