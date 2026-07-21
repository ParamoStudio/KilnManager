# Running your own relay

Firings travel between your phone and your computer through a small **relay**: a
mailbox that holds a firing until the computer picks it up. By default that's
the one Páramo runs, and you don't have to do anything.

You might want your own if you'd rather the data never touched someone else's
infrastructure, or if you want to keep working when Páramo's relay is down.

**What actually passes through it:** client first names and the shape of a
firing (shelves, heights, complexity). Never prices, never payment details,
never anything about your accounts. Everything self-deletes after 7 days.

It's free. Cloudflare's free tier is far more than a studio will ever use.

---

## 1. Make a Cloudflare account

Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up. You don't
need a domain and you don't need to enter a card.

## 2. Create the storage

In the sidebar go to **Storage & Databases → KV**, then **Create instance**.

Name it exactly:

```
KILN_RELAY
```

## 3. Create the worker

In the sidebar go to **Compute → Workers & Pages → Create → Start with Hello
World**, name it `kiln-relay`, and deploy it. The default code doesn't matter,
you're about to replace it.

Then open **Edit code**, delete everything in the editor, and paste the entire
contents of [`relay/worker.js`](../relay/worker.js) from this repository.
Click **Deploy**.

> Paste that file specifically. A generic "key-value store" worker (the kind an
> AI assistant might offer to write for you) will *look* like it works and then
> fail: it has none of the channel routes, no CORS, and no expiry, so the phone
> can't even talk to it.

## 4. Connect the storage to the worker

Still in your worker: **Settings → Bindings → Add binding → KV namespace**.

- **Variable name:** `KILN_RELAY`
- **KV namespace:** the `KILN_RELAY` you created in step 2

**Save and deploy.** The variable name has to match exactly, or the worker
won't find its storage.

## 5. Copy the address

On the worker's overview page you'll see its URL, something like:

```
https://kiln-relay.your-subdomain.workers.dev
```

## 6. Tell Kiln Manager to use it

In Kiln Manager open the **phone button** in the top right, scroll to
**Advanced** at the bottom, and paste the address.

Press **Test connection**. The app writes a small probe to your relay and reads
it back, so a green tick means it's genuinely working, not just that the address
resolves. Then press **Use this relay**.

Switching relays unpairs every phone, because a different relay is a different
mailbox. Scan the new QR on each phone and you're done — the address travels
inside the QR, so there's nothing to type on the phone.

---

## Checking it later

Open this in a browser:

```
https://your-relay.workers.dev/channel/x/down
```

It should show `{"error":"bad token"}`. That's the relay correctly rejecting a
malformed token, which means it's alive and running the right code. If you get
"Not found" or a Cloudflare error page instead, the worker code didn't save.

## Going back

Clear the field in **Advanced** (or press **Back to Páramo's**) and re-pair your
phones. Anything still sitting on your old relay expires by itself.
