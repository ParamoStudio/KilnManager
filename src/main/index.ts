import { app, BrowserWindow, nativeImage } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { registerStorage } from "./storage.js";
import { registerBrand } from "./brand.js";
import { registerOutputs } from "./outputs.js";
import { registerMarket } from "./market.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// App icon. resources/ sits at the project root in dev (app.getAppPath()) and is
// bundled as an extra resource once packaging is set up.
const iconPath = join(app.getAppPath(), "resources", "icon.png");
const appIcon = nativeImage.createFromPath(iconPath);

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#0b0b0d",
    icon: appIcon,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  // macOS shows the dock icon rather than the window icon.
  if (process.platform === "darwin" && app.dock && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon);
  }
  registerStorage();
  registerBrand();
  registerOutputs();
  registerMarket();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
