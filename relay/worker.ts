/**
 * Páramo Kiln Loader — pairing relay (Cloudflare Worker + KV).
 *
 * A tiny, self-owned "mailbox" so a phone and a desktop that are NOT on the same
 * network can still exchange data. It stores two things per pairing token:
 *
 *   down:<token>  — the desktop's read-only payload for the phone
 *                   { contacts, kilns, complexity }  (NEVER any prices/costs)
 *   up:<token>    — the phone's pending firings the desktop hasn't imported yet
 *                   [ { id, firing, title, notes, createdAt }, ... ]
 *
 * The token is a long random string, delivered only by scanning a QR on the
 * desktop — it is the only credential. The data is low-sensitivity (client
 * first names, draft firings; no payments, no accounts). Everything also
 * carries a TTL so a channel self-expires even if nothing explicitly deletes it.
 *
 * This is deliberately ~1 file and dependency-free. Deploy with `wrangler`
 * (see README.md). Nothing here is Páramo-specific enough to hide — it's MIT.
 */

export interface Env {
  KILN_RELAY: KVNamespace;
}

// A channel that sees no traffic for a week is dropped. Every write refreshes it.
const TTL_SECONDS = 7 * 24 * 60 * 60;
// Guardrails: the phone never holds more than 5 pending firings, and payloads
// stay small (structure only). These bound abuse without needing accounts.
const MAX_PENDING = 5;
const MAX_BODY_BYTES = 512 * 1024;
// A token is only ever machine-generated (QR). Reject anything malformed early.
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
function err(status: number, message: string): Response {
  return json({ error: message }, status);
}

interface PendingFiring {
  id: string;
  firing: unknown; // an opaque PlannerState blob — the relay never inspects it
  title: string;
  notes: Record<string, string>;
  createdAt: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    // /channel/:token/(down|up)
    const m = url.pathname.match(/^\/channel\/([^/]+)\/(down|up)\/?$/);
    if (!m) return err(404, "not found");

    const token = m[1]!;
    const box = m[2]! as "down" | "up";
    if (!TOKEN_RE.test(token)) return err(400, "bad token");

    const key = `${box}:${token}`;

    // ---- down: desktop → phone (contacts + kilns + complexity) --------------
    if (box === "down") {
      if (request.method === "GET") {
        const v = await env.KILN_RELAY.get(key);
        return v ? new Response(v, { headers: { "Content-Type": "application/json", ...CORS } }) : json(null);
      }
      if (request.method === "PUT") {
        const body = await readJson(request);
        if (body === undefined) return err(413, "body too large or invalid");
        await env.KILN_RELAY.put(key, JSON.stringify(body), { expirationTtl: TTL_SECONDS });
        return json({ ok: true });
      }
      return err(405, "method not allowed");
    }

    // ---- up: phone → desktop (pending firings) ------------------------------
    if (request.method === "GET") {
      const list = await readList(env, key);
      return json(list);
    }
    if (request.method === "POST") {
      const body = await readJson(request);
      if (body === undefined || typeof body !== "object" || body === null) return err(413, "body too large or invalid");
      const list = await readList(env, key);
      if (list.length >= MAX_PENDING) return err(409, "pending limit reached");
      const item = body as Partial<PendingFiring>;
      const entry: PendingFiring = {
        id: (typeof item.id === "string" && item.id) || crypto.randomUUID(),
        firing: item.firing ?? null,
        title: typeof item.title === "string" ? item.title : "",
        notes: (item.notes && typeof item.notes === "object" ? item.notes : {}) as Record<string, string>,
        createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
      };
      // De-dupe by id so a retried POST doesn't double-insert.
      const next = [...list.filter((x) => x.id !== entry.id), entry];
      await env.KILN_RELAY.put(key, JSON.stringify(next), { expirationTtl: TTL_SECONDS });
      return json({ ok: true, id: entry.id });
    }
    if (request.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        // No id → clear the whole up-box (desktop confirmed it read everything).
        await env.KILN_RELAY.delete(key);
        return json({ ok: true, cleared: "all" });
      }
      const list = await readList(env, key);
      const next = list.filter((x) => x.id !== id);
      if (next.length) await env.KILN_RELAY.put(key, JSON.stringify(next), { expirationTtl: TTL_SECONDS });
      else await env.KILN_RELAY.delete(key);
      return json({ ok: true, id });
    }
    return err(405, "method not allowed");
  },
};

async function readJson(request: Request): Promise<unknown | undefined> {
  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    return undefined;
  }
}

async function readList(env: Env, key: string): Promise<PendingFiring[]> {
  const v = await env.KILN_RELAY.get(key);
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? (parsed as PendingFiring[]) : [];
  } catch {
    return [];
  }
}
