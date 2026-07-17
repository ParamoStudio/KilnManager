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
      outputsReveal(absPath: string): Promise<void>;
      outputsShare(absPath: string): Promise<void>;
      outputsOpenFolder(): Promise<void>;
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
  async reveal(absPath: string): Promise<void> {
    await window.kilnAPI?.outputsReveal(absPath);
  },
  async share(absPath: string): Promise<void> {
    await window.kilnAPI?.outputsShare(absPath);
  },
  async openFolder(): Promise<void> {
    await window.kilnAPI?.outputsOpenFolder();
  },
};
