import { describe, it, expect } from "vitest";
import { encodePairing, decodePairing } from "../mobile/src/lib/paircode";

const PAIRING = {
  token: "a7f3c9d2e5b184067af2c3d9e8b5710c",
  base: "https://kiln-relay.paramoyermo.workers.dev",
};

describe("pairing code", () => {
  it("survives a round trip", () => {
    expect(decodePairing(encodePairing(PAIRING))).toEqual(PAIRING);
  });

  it("survives a clipboard that adds whitespace or drops the case of the prefix", () => {
    const code = encodePairing(PAIRING);
    expect(decodePairing(`  ${code}\n`)).toEqual(PAIRING);
    expect(decodePairing(code.replace("KL-", "kl-"))).toEqual(PAIRING);
  });

  it("accepts a pasted pair link, since that's what the QR gave them", () => {
    const url = `https://paramostudio.github.io/KilnManager/#pair=${PAIRING.token}~${encodeURIComponent(PAIRING.base)}`;
    expect(decodePairing(url)).toEqual(PAIRING);
  });

  it("keeps a self-hosted relay's address intact", () => {
    const own = { token: "xyz789", base: "https://my-own-relay.someone.workers.dev" };
    expect(decodePairing(encodePairing(own))).toEqual(own);
  });

  it("refuses junk rather than half-pairing", () => {
    for (const bad of ["", "   ", "hello", "KL-!!!!", "KL-" + btoa("no-tilde-here")]) {
      expect(decodePairing(bad)).toBeNull();
    }
  });

  it("refuses a relay that isn't a URL, which would only fail later", () => {
    const forged = "KL-" + btoa("token~ftp://sneaky").replace(/=+$/, "");
    expect(decodePairing(forged)).toBeNull();
  });
});
