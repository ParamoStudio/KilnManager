# Kiln Loader relay

A tiny [Cloudflare Worker](https://developers.cloudflare.com/workers/) + KV that
lets the **phone** (Kiln Loader PWA) and the **desktop** (Kiln Manager) exchange
data without being on the same network. It's a dumb, token-keyed mailbox — it
never inspects or prices anything.

- **No accounts.** The only credential is a long random pairing token, delivered
  by scanning a QR shown on the desktop.
- **No sensitive data.** Down: client first names + kiln structure (no prices).
  Up: draft firings (structure only). Everything self-expires after 7 days.
- **Free tier is plenty** — a channel sees only a handful of tiny reads/writes.

## Routes

| Method | Path                       | Who     | What                                        |
| ------ | -------------------------- | ------- | ------------------------------------------- |
| PUT    | `/channel/:token/down`     | desktop | overwrite `{ contacts, kilns, complexity }` |
| GET    | `/channel/:token/down`     | phone   | read that payload (cached offline on phone) |
| POST   | `/channel/:token/up`       | phone   | append one pending firing (max 5)           |
| GET    | `/channel/:token/up`       | desktop | list pending firings                        |
| DELETE | `/channel/:token/up?id=X`  | desktop | remove one firing (confirmed imported)      |
| DELETE | `/channel/:token/up`       | desktop | clear all pending firings                   |

## Deploy (one time)

You need a free Cloudflare account. Then, from this folder:

```bash
npm install -g wrangler        # or: npx wrangler ...
wrangler login                 # opens the browser once

# 1. Create the KV namespace and copy the printed id into wrangler.toml
wrangler kv namespace create KILN_RELAY

# 2. Deploy
wrangler deploy
```

`wrangler deploy` prints the Worker URL, e.g.
`https://kiln-relay.<your-subdomain>.workers.dev`. That base URL goes into the
desktop app (it's baked into the QR alongside the token), so the phone learns it
automatically on pairing — you never type it on the phone.

## Local test (optional, before wiring the apps)

```bash
wrangler dev                   # serves on http://127.0.0.1:8787
TOKEN=testtoken0000001

curl -X PUT  localhost:8787/channel/$TOKEN/down -d '{"contacts":[],"kilns":[],"complexity":{"simple":1,"medium":1.15,"complex":1.4}}'
curl        localhost:8787/channel/$TOKEN/down
curl -X POST localhost:8787/channel/$TOKEN/up   -d '{"title":"Test","firing":{},"notes":{}}'
curl        localhost:8787/channel/$TOKEN/up
curl -X DELETE "localhost:8787/channel/$TOKEN/up"
```
