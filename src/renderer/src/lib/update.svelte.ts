/**
 * "There's a newer version" check, run once when the app opens.
 *
 * Deliberately not an auto-updater: the builds are unsigned, so downloading and
 * swapping the app behind the user's back would be both harder to do safely and
 * worse to be on the receiving end of. This just compares the running version
 * against the latest GitHub release and points at the download page.
 *
 * Silent on every failure — offline, rate-limited, no releases yet. Someone
 * loading a kiln does not need to hear that GitHub was unreachable.
 */
import { storage, isDesktop } from "./storage";
import { isNewer } from "./semver";

const LATEST_API = "https://api.github.com/repos/ParamoStudio/KilnManager/releases/latest";
export const RELEASES_PAGE = "https://github.com/ParamoStudio/KilnManager/releases/latest";

export const update = $state<{
  current: string;
  latest: string;
  available: boolean;
}>({
  current: "",
  latest: "",
  available: false,
});

export async function checkForUpdate(): Promise<void> {
  // Only the packaged desktop app can be out of date; the web build is
  // whatever the server last served.
  if (!isDesktop || !window.kilnAPI) return;
  try {
    update.current = await window.kilnAPI.appVersion();
    const res = await fetch(LATEST_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return;
    const data = (await res.json()) as { tag_name?: string; draft?: boolean; prerelease?: boolean };
    if (!data.tag_name || data.draft || data.prerelease) return;

    const latest = data.tag_name.replace(/^v/i, "");
    if (!isNewer(update.current, latest)) return;

    // Don't nag about a version they've already been told about and chose to
    // ignore — it'll come back when there's a newer one still.
    const dismissed = await storage.read<string>("updateDismissed");
    update.latest = latest;
    update.available = dismissed !== latest;
  } catch {
    /* offline, rate-limited, or no releases — nothing worth saying */
  }
}

export async function dismissUpdate(): Promise<void> {
  update.available = false;
  try {
    await storage.write("updateDismissed", update.latest);
  } catch {
    /* if it can't be remembered it'll just ask again next time */
  }
}
