import { contextBridge, ipcRenderer } from "electron";

/** Minimal, safe surface exposed to the renderer. No Node access leaks. */
const kilnAPI = {
  read: (key: string): Promise<unknown> => ipcRenderer.invoke("storage:read", key),
  write: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke("storage:write", key, value),
  list: (): Promise<string[]> => ipcRenderer.invoke("storage:list"),
  // Vault (the user-owned data folder)
  vaultStatus: (): Promise<{ configured: boolean; path: string | null; valid: boolean }> =>
    ipcRenderer.invoke("vault:status"),
  vaultPick: (mode: "create" | "locate"): Promise<{ ok: boolean; reason?: string; path?: string }> =>
    ipcRenderer.invoke("vault:pick", mode),
  vaultReveal: (): Promise<void> => ipcRenderer.invoke("vault:reveal"),
};

contextBridge.exposeInMainWorld("kilnAPI", kilnAPI);

export type KilnAPI = typeof kilnAPI;
