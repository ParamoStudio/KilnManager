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
  // Outputs (client tickets)
  savePdf: (html: string, relParts: string[]): Promise<string | null> =>
    ipcRenderer.invoke("outputs:savePdf", html, relParts),
  saveCosts: (data: unknown): Promise<string | null> => ipcRenderer.invoke("outputs:saveCosts", data),
  openExpenses: (): Promise<void> => ipcRenderer.invoke("outputs:openExpenses"),
  outputsReveal: (absPath: string): Promise<void> => ipcRenderer.invoke("outputs:reveal", absPath),
  outputsOpenFile: (absPath: string): Promise<void> => ipcRenderer.invoke("outputs:openFile", absPath),
  outputsShare: (absPath: string): Promise<void> => ipcRenderer.invoke("outputs:share", absPath),
  outputsOpenFolder: (): Promise<void> => ipcRenderer.invoke("outputs:openFolder"),
};

contextBridge.exposeInMainWorld("kilnAPI", kilnAPI);

export type KilnAPI = typeof kilnAPI;
