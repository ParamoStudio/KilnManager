/**
 * Logo preparation for the client ticket.
 *
 * Logos are stored inside `settings.json` as data URIs, which means a 4 MB
 * photo straight off a phone becomes a ~5.5 MB string that every settings save
 * has to carry. Ticket logos are printed a couple of centimetres wide, so
 * there is nothing to gain from that and a lot to lose.
 *
 * So we re-encode on the way in: bounded dimensions, PNG (logos usually have
 * transparency), which lands a real logo in the tens of kilobytes.
 */

/** Wide enough to stay crisp at print size on a retina screen. */
const MAX_EDGE = 640;

export interface PreparedImage {
  dataUri: string;
  /** Rough size of the stored string, for showing the user. */
  bytes: number;
  shrunk: boolean;
}

export async function prepareLogo(file: File): Promise<PreparedImage | null> {
  if (!file.type.startsWith("image/")) return null;

  const original = await readAsDataUri(file);
  if (!original) return null;

  // SVG is already small and scales perfectly; rasterising it would only make
  // it worse.
  if (file.type === "image/svg+xml") {
    return { dataUri: original, bytes: original.length, shrunk: false };
  }

  const img = await loadImage(original);
  if (!img) return { dataUri: original, bytes: original.length, shrunk: false };

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  if (scale === 1 && original.length < 200_000) {
    return { dataUri: original, bytes: original.length, shrunk: false };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUri: original, bytes: original.length, shrunk: false };
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const out = canvas.toDataURL("image/png");
  // Only keep the re-encode if it actually helped — a small flat PNG can come
  // out bigger than it went in.
  if (out.length >= original.length) {
    return { dataUri: original, bytes: original.length, shrunk: false };
  }
  return { dataUri: out, bytes: out.length, shrunk: true };
}

function readAsDataUri(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
