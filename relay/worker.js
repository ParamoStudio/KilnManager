/**
 * Páramo Kiln Loader — pairing relay (Cloudflare Worker + KV).
 *
 * Plain-JavaScript build of worker.ts, meant to be PASTED into the Cloudflare
 * dashboard editor (Workers → your worker → Edit code). Behaviour is identical;
 * see worker.ts for the fully commented/typed source and relay/README.md for
 * the contract.
 *
 * Requires a KV binding named exactly: KILN_RELAY
 */

const TTL_SECONDS = 7 * 24 * 60 * 60; // a quiet channel self-expires in a week
// Shared across every phone paired to this token: a studio can have several
// people loading kilns at once, so this can't be a single phone's limit.
const MAX_PENDING = 25;
const MAX_BODY_BYTES = 512 * 1024;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
function err(status, message) {
  return json({ error: message }, status);
}

async function readJson(request) {
  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    return undefined;
  }
}

async function readList(env, key) {
  const v = await env.KILN_RELAY.get(key);
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const m = url.pathname.match(/^\/channel\/([^/]+)\/(down|up)\/?$/);
    if (!m) return err(404, "not found");

    const token = m[1];
    const box = m[2];
    if (!TOKEN_RE.test(token)) return err(400, "bad token");

    const key = `${box}:${token}`;

    // ---- down: desktop → phone (contacts + kiln structure + complexity) ----
    if (box === "down") {
      if (request.method === "GET") {
        const v = await env.KILN_RELAY.get(key);
        return v
          ? new Response(v, { headers: { "Content-Type": "application/json", ...CORS } })
          : json(null);
      }
      if (request.method === "PUT") {
        const body = await readJson(request);
        if (body === undefined) return err(413, "body too large or invalid");
        await env.KILN_RELAY.put(key, JSON.stringify(body), { expirationTtl: TTL_SECONDS });
        return json({ ok: true });
      }
      return err(405, "method not allowed");
    }

    // ---- up: phone → desktop (pending firings) -----------------------------
    if (request.method === "GET") {
      return json(await readList(env, key));
    }
    if (request.method === "POST") {
      const body = await readJson(request);
      if (body === undefined || typeof body !== "object" || body === null) {
        return err(413, "body too large or invalid");
      }
      const list = await readList(env, key);
      if (list.length >= MAX_PENDING) return err(409, "pending limit reached");
      const entry = {
        id: (typeof body.id === "string" && body.id) || crypto.randomUUID(),
        firing: body.firing ?? null,
        title: typeof body.title === "string" ? body.title : "",
        notes: body.notes && typeof body.notes === "object" ? body.notes : {},
        createdAt: typeof body.createdAt === "number" ? body.createdAt : Date.now(),
      };
      const next = [...list.filter((x) => x.id !== entry.id), entry];
      await env.KILN_RELAY.put(key, JSON.stringify(next), { expirationTtl: TTL_SECONDS });
      return json({ ok: true, id: entry.id });
    }
    if (request.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        await env.KILN_RELAY.delete(key);
        return json({ ok: true, cleared: "all" });
      }
      const list = await readList(env, key);
      const next = list.filter((x) => x.id !== id);
      if (next.length) {
        await env.KILN_RELAY.put(key, JSON.stringify(next), { expirationTtl: TTL_SECONDS });
      } else {
        await env.KILN_RELAY.delete(key);
      }
      return json({ ok: true, id });
    }
    return err(405, "method not allowed");
  },
};
