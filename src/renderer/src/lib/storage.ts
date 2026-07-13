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

declare global {
  interface Window {
    kilnAPI?: {
      read(key: string): Promise<unknown>;
      write(key: string, value: unknown): Promise<void>;
      list(): Promise<string[]>;
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
