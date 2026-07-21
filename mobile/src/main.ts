import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

const app = mount(App, { target: document.getElementById("app")! });

/**
 * The service worker only looks for a new version when it registers — i.e. on a
 * cold start. An installed app can sit in the background for days, so ask again
 * whenever it comes back to the foreground; otherwise a fix shipped today
 * wouldn't reach a phone that never fully closes the app.
 *
 * This only *fetches* the update. It's applied on the next launch rather than
 * reloading underfoot, so the page can't reset while someone is mid-load at the
 * kiln. Failures are ignored: offline is the normal case here.
 */
if ("serviceWorker" in navigator) {
  const checkForUpdate = (): void => {
    if (document.visibilityState !== "visible") return;
    void navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {
        /* offline — try again next time it's opened */
      });
  };
  document.addEventListener("visibilitychange", checkForUpdate);
  window.addEventListener("focus", checkForUpdate);
}

export default app;
