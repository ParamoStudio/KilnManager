/**
 * Encoding for a pairing carried by hand instead of by QR.
 *
 * Scanning the QR pairs *the browser that scanned it*, and that isn't always
 * the browser you end up using: on iOS a home-screen web app gets a storage
 * container of its own, so a pairing made in Safari is invisible to it. Rather
 * than guess which platforms share storage, every phone can copy its code and
 * paste it wherever it's actually needed.
 *
 * Pure on purpose — no state, no storage — so the round trip can be tested.
 */

export interface Pairing {
  base: string; // relay base URL, e.g. https://kiln-relay.xyz.workers.dev
  token: string;
}

const PREFIX = "KL-";

/** base64url: survives a clipboard round trip in one piece, and doesn't look
 * like a link the phone will try to turn into a tappable URL. */
export function encodePairing(p: Pairing): string {
  const raw = `${p.token}~${p.base}`;
  const b64 = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return PREFIX + b64;
}

/**
 * Accepts a pairing code or a pasted pair URL — people paste what they have,
 * and the link from the QR is just as valid a thing to have kept.
 * Returns null for anything it can't make sense of.
 */
export function decodePairing(input: string): Pairing | null {
  const text = input.trim();
  if (!text) return null;

  const url = text.match(/#pair=([^~\s]+)~(\S+)/);
  if (url) return validate(url[1]!, safeDecodeURI(url[2]!));

  const body = text.replace(/^KL-/i, "").replace(/\s+/g, "");
  let decoded: string;
  try {
    decoded = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }
  const cut = decoded.indexOf("~");
  if (cut < 0) return null;
  return validate(decoded.slice(0, cut), decoded.slice(cut + 1));
}

function safeDecodeURI(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** A code is only useful if it names a token and a relay we could actually
 * reach; anything else would fail later and more confusingly. */
function validate(token: string, base: string): Pairing | null {
  if (!token || !/^https?:\/\/\S+$/.test(base)) return null;
  return { token, base };
}
