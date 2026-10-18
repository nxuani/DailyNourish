# FatSecret proxy

A tiny Node server that stands between the app and the FatSecret API.

```
app  ->  this proxy (holds the secret, has a whitelisted IP)  ->  FatSecret
```

**Why it exists:** FatSecret only accepts requests from whitelisted IPs, and the
client secret must never ship inside the mobile app. The proxy solves both: it
runs on a host with a whitelisted IP and is the only place the secret lives.

No dependencies — plain Node 18+ (uses the built-in `fetch`).

---

## Deploy to Render (free)

1. Push this repo to GitHub (the `server/` folder needs to be on GitHub).
2. Go to [render.com](https://render.com) → sign up with GitHub (free, no card).
3. **New → Web Service** → pick the `DailyNourish` repo.
4. Configure:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** *(leave blank — no deps)*
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Under **Environment**, add these variables (values come from the FatSecret
   console — the same pair currently in the app's `.env`):
   - `FATSECRET_CLIENT_ID`
   - `FATSECRET_CLIENT_SECRET`
   - `FATSECRET_SCOPE` = `premier`
   - *(optional, add later)* `PROXY_TOKEN` = some long random string
6. Deploy. Render gives you a URL like `https://dailynourish-xxxx.onrender.com`.

## Whitelist Render's outbound IPs in FatSecret

1. Open Render's current outbound IP ranges: <https://render.com/docs/outbound-ip-addresses>
   — find the CIDR range(s) for **your service's region**.
2. In the FatSecret console → your app → API Keys → IP allowlist, add that/those
   CIDR range(s). Premier accounts accept CIDR ranges (up to 15).
3. Changes can take a little while to propagate.

## Verify it works

```bash
# should return {"ok":true}
curl https://YOUR-RENDER-URL/health

# should return FatSecret results
curl "https://YOUR-RENDER-URL/search?q=bowl"
```

If `/search` returns `{"error":"Token request failed ... invalid_client"}`, the
Render IP range isn't whitelisted yet (or the id/secret are wrong).

---

## Endpoints

- `GET /health` → `{ "ok": true }`
- `GET /search?q=<text>&max=<1-50>&page=<0+>` → normalized results:

```json
{
  "query": "bowl",
  "total": 220,
  "page": 0,
  "results": [
    {
      "id": "41963",
      "name": "Rice Bowl",
      "brand": null,
      "type": "Generic",
      "url": "https://...",
      "description": "Per 1 serving - Calories: 300kcal | ...",
      "serving": "1 serving",
      "calories": 300,
      "fat": 13,
      "carbs": 32,
      "protein": 15
    }
  ]
}
```

## Security notes

- The FatSecret secret lives **only** in Render's env vars, never in the app or
  in git.
- Set `PROXY_TOKEN` once things work, then have the app send it as the
  `x-proxy-token` header, so only the app can use your FatSecret quota.
- A stronger option later: verify the caller's Supabase JWT in the proxy instead
  of a shared token.
