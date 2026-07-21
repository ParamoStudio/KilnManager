/**
 * Local persistence for the mobile companion — always a plain browser, so this
 * is just the `browserAdapter` half of the desktop app's storage.ts (same
 * interface/shape, so a synced payload never needs translating). No Electron,
 * no vault: everything lives in this device's localStorage.
 */
export interface StorageAdapter {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  list(): Promise<string[]>;
}

const PREFIX = "kiln-mobile:";

export const storage: StorageAdapter = {
  async read<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async write<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    localStorage.removeItem(PREFIX + key);
  },
  async list(): Promise<string[]> {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .map((k) => k.slice(PREFIX.length));
  },
};
