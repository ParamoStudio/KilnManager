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

export function markContactsDirty(): void {
  syncDirty.contacts = true;
}
export function markKilnsDirty(): void {
  syncDirty.kilns = true;
}
