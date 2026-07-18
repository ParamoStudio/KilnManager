/**
 * Storage adapter — the persistence portability boundary.
 *
 * In Electron, `window.kilnAPI` (from the preload) writes JSON files on disk.
 * In a plain browser (the future Páramo web build), we fall back to
 * localStorage. Same interface either way, so the UI never knows the difference.
 */
export interface StorageAdapter {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
  list(): Promise<string[]>;
}

export interface VaultStatus {
  configured: boolean;
  path: string | null;
  valid: boolean;
}
export interface VaultPickResult {
  ok: boolean;
  reason?: string;
  path?: string;
}

declare global {
  interface Window {
    kilnAPI?: {
      read(key: string): Promise<unknown>;
      write(key: string, value: unknown): Promise<void>;
      list(): Promise<string[]>;
      vaultStatus(): Promise<VaultStatus>;
      vaultPick(mode: "create" | "locate"): Promise<VaultPickResult>;
      vaultReveal(): Promise<void>;
      savePdf(html: string, relParts: string[]): Promise<string | null>;
      saveCosts(data: unknown): Promise<string | null>;
      openExpenses(): Promise<void>;
      outputsReveal(absPath: string): Promise<void>;
      outputsOpenFile(absPath: string): Promise<string>;
      outputsShare(absPath: string): Promise<void>;
      outputsOpenFolder(): Promise<void>;
      openExternal(url: string): Promise<void>;
      marketElectricity(zone: string): Promise<ElectricityRef | { ok: false }>;
      marketPropane(region: string): Promise<PropaneRef | { ok: false }>;
    };
  }
}

const PREFIX = "kiln:";

const browserAdapter: StorageAdapter = {
  async read<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async write<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  async list(): Promise<string[]> {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .map((k) => k.slice(PREFIX.length));
  },
};

const electronAdapter = (api: NonNullable<Window["kilnAPI"]>): StorageAdapter => ({
  read: <T>(key: string) => api.read(key) as Promise<T | null>,
  write: (key, value) => api.write(key, value),
  list: () => api.list(),
});

export const storage: StorageAdapter =
  typeof window !== "undefined" && window.kilnAPI
    ? electronAdapter(window.kilnAPI)
    : browserAdapter;

export const isDesktop = typeof window !== "undefined" && !!window.kilnAPI;

/**
 * Vault (the user's data folder). On the web build there is no real folder, so
 * we report "valid" and the onboarding is skipped (data stays in localStorage).
 */
export const vault = {
  async status(): Promise<VaultStatus> {
    if (!window.kilnAPI) return { configured: true, path: null, valid: true };
    return window.kilnAPI.vaultStatus();
  },
  async pick(mode: "create" | "locate"): Promise<VaultPickResult> {
    if (!window.kilnAPI) return { ok: false, reason: "not-desktop" };
    return window.kilnAPI.vaultPick(mode);
  },
  async reveal(): Promise<void> {
    await window.kilnAPI?.vaultReveal();
  },
};

/** Client ticket exports (desktop only; no-ops on the web build). */
export const outputs = {
  async savePdf(html: string, relParts: string[]): Promise<string | null> {
    return window.kilnAPI ? window.kilnAPI.savePdf(html, relParts) : null;
  },
  async saveCosts(data: unknown): Promise<string | null> {
    return window.kilnAPI ? window.kilnAPI.saveCosts(data) : null;
  },
  async openExpenses(): Promise<void> {
    await window.kilnAPI?.openExpenses();
  },
  async reveal(absPath: string): Promise<void> {
    await window.kilnAPI?.outputsReveal(absPath);
  },
  /** Opens a file in its default app. Returns "" on success, else an error. */
  async openFile(absPath: string): Promise<string> {
    return window.kilnAPI ? window.kilnAPI.outputsOpenFile(absPath) : "not-desktop";
  },
  async share(absPath: string): Promise<void> {
    await window.kilnAPI?.outputsShare(absPath);
  },
  async openFolder(): Promise<void> {
    await window.kilnAPI?.outputsOpenFolder();
  },
};

/** Open an external https link (Electron: system browser; web: new tab). */
export function openLink(url: string): void {
  if (window.kilnAPI) void window.kilnAPI.openExternal(url);
  else window.open(url, "_blank", "noopener");
}

export interface ElectricityRef {
  ok: true;
  currentKwh: number;
  avgKwh: number;
  asOf: number;
  zone: string;
  source: string;
}
export interface PropaneRef {
  ok: true;
  region: string;
  butaneKg?: number;
  propaneKg?: number;
  asOf: string;
  source: string;
  approx?: boolean;
}

/** Live/reference market data (desktop only; web returns unavailable). */
export const market = {
  async electricity(zone: string): Promise<ElectricityRef | { ok: false }> {
    return window.kilnAPI ? window.kilnAPI.marketElectricity(zone) : { ok: false };
  },
  async propane(region: string): Promise<PropaneRef | { ok: false }> {
    return window.kilnAPI ? window.kilnAPI.marketPropane(region) : { ok: false };
  },
};
