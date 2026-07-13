import { contextBridge, ipcRenderer } from "electron";

/** Minimal, safe surface exposed to the renderer. No Node access leaks. */
const kilnAPI = {
  read: (key: string): Promise<unknown> => ipcRenderer.invoke("storage:read", key),
  write: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke("storage:write", key, value),
  list: (): Promise<string[]> => ipcRenderer.invoke("storage:list"),
};

contextBridge.exposeInMainWorld("kilnAPI", kilnAPI);

export type KilnAPI = typeof kilnAPI;
