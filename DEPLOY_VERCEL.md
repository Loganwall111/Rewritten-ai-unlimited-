# Deploy to Vercel (with live Paddle billing)

Your project already builds to Vercel's native Build Output API v3 — no `vercel.json` needed. Just push and click.

## 1 · Push to GitHub

```bash
cd api-key-manager
git add -A
git commit -m "Ready for Vercel deploy"
git push origin main
```

## 2 · Import into Vercel

1. Open [vercel.com/new](https://vercel.com/new)
2. Select your GitHub repo (`Loganwall111/api-key-manager`)
3. **Framework Preset**: leave as auto-detected (Vite)
4. **Build & Output Settings**: leave defaults — the build command is already `npm run build`, Vercel auto-sets `VERCEL=1`, and `vite.config.ts` picks the `vercel` Nitro preset automatically
5. Do **NOT** deploy yet — add env vars first (next step)

## 3 · Environment variables

Under **Project Settings → Environment Variables**, add:

### Required
| Key | Value | Where to get it |
|---|---|---|
| `LOVABLE_API_KEY` | *(existing)* | Already in your local `.env` |
| `SUPABASE_URL` | `https://jwiekgybiqnlnsgqapya.supabase.co` | From `.env` |
| `SUPABASE_PUBLISHABLE_KEY` | *(existing anon key)* | From `.env` |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` | From `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as `SUPABASE_PUBLISHABLE_KEY` | From `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(secret)* | Supabase → Project Settings → API → `service_role` |

### Paddle (live)
| Key | Value | Where |
|---|---|---|
| `PADDLE_API_KEY` | `pdl_live_apikey_...` | Paddle → Developer Tools → Authentication → API keys |
| `PADDLE_ENV` | `production` | (literal string) |
| `PADDLE_WEBHOOK_SECRET` | `pdl_ntfset_...` | Paddle → Developer Tools → Notifications → your endpoint |
| `PADDLE_PRICE_UNLIMITED_PLUS` | `pri_01...` | Paddle → Catalog → Products |
| `PADDLE_PRICE_INFINITY` | `pri_01...` | Paddle → Catalog → Products |
| `VITE_PADDLE_CLIENT_TOKEN` | `live_...` | Paddle → Developer Tools → Client-side tokens |
| `VITE_PADDLE_ENVIRONMENT` | `production` | (literal string) |
| `VITE_PADDLE_PRICE_UNLIMITED_PLUS` | same as server one | (yes, both — one is for browser, one for server) |
| `VITE_PADDLE_PRICE_INFINITY` | same as server one | ditto |

### Optional but recommended
| Key | Value | Effect |
|---|---|---|
| `ELEVENLABS_API_KEY` | `sk_...` from [elevenlabs.io](https://elevenlabs.io) | Top-tier voice for tutorial + mic. Without it, falls back to OpenAI TTS then to OS neural voice — still good, but ElevenLabs is dramatically more realistic. |

**Important:** Vite-exposed vars must start with `VITE_` (they're bundled into the client). Server-only secrets do NOT get the `VITE_` prefix.

## 4 · Deploy

Click **Deploy**. Vercel will:
- `npm install`
- `npm run build` (sees `VERCEL=1`, picks the `vercel` Nitro preset)
- Detect `.vercel/output/` and deploy it directly
- Give you a URL like `api-key-manager-xxx.vercel.app`

Add a custom domain under **Settings → Domains** if you want.

## 5 · Configure Paddle for the deployed URL

Once you have your production URL:

1. **Approved domains**: Paddle → Checkout → Domains → Add your production domain (`api-key-manager-xxx.vercel.app` or your custom one). Without this, the checkout overlay refuses to load.
2. **Webhook**: Paddle → Developer Tools → Notifications → Add destination
   - URL: `https://YOUR-DOMAIN/api/paddle-webhook`
   - Events: `subscription.created`, `subscription.updated`, `subscription.activated`, `subscription.canceled`, `subscription.past_due`, `transaction.completed`
   - Copy the notification secret → paste into `PADDLE_WEBHOOK_SECRET` env var → redeploy

## 6 · Test the full flow

1. Visit your deployed URL → wormhole intro plays → welcome tutorial fires
2. Sign in with a Supabase user (or create one via `/auth`)
3. Go to `/billing`
4. Click the **Unlimited+** or **Infinity** orb → Paddle Checkout overlay opens
5. Complete a real purchase (or use a Paddle test card first if switching to sandbox: `4000 0566 5566 5556`)
6. Within ~5 seconds you should see the "Currently on" pill update — that's the webhook firing → Supabase upserting → UI refetching
7. Verify: Supabase → Table Editor → `subscriptions` → row was created/updated

## 7 · If something breaks

- **Checkout button shows "VITE_PADDLE_CLIENT_TOKEN not set"**: env var wasn't propagated — Settings → Env Vars → check it's set for Production + redeploy.
- **Webhook not firing**: Paddle Notifications page shows delivery attempts + response codes. 401 = wrong `PADDLE_WEBHOOK_SECRET`. 404 = wrong URL.
- **Voice sounds robotic**: `ELEVENLABS_API_KEY` isn't set. Add it + redeploy for premium voice; otherwise you get the OS's best neural voice (Samantha / Google UK Female / MS Aria Online).
- **Build fails on Vercel**: check the build log — usually a missing env var like `SUPABASE_URL`. All `SUPABASE_*` and `LOVABLE_API_KEY` must be present at build time.

## Deploying to a different platform later

The `vite.config.ts` I set up picks the Nitro preset from a `DEPLOY_TARGET` env var:

```bash
DEPLOY_TARGET=vercel      npm run build   # → .vercel/output/
DEPLOY_TARGET=cloudflare  npm run build   # → .output/server/ (wrangler deploy)
DEPLOY_TARGET=netlify     npm run build   # → .netlify/functions/
DEPLOY_TARGET=node        npm run build   # → .output/server/index.mjs (node .output/server/index.mjs)
```

Vercel auto-sets `VERCEL=1` and Netlify auto-sets `NETLIFY=true`, so the config picks the right preset without you setting `DEPLOY_TARGET` explicitly.

---

## ⚠️ Security reminder

If you paste any Paddle key into a chat, a public repo, or a screenshot, treat
it as compromised immediately. Rotate it in Paddle before deploying:

1. Paddle → Developer Tools → Authentication → API keys
2. Revoke any exposed key
3. Generate a fresh one
4. Store it in Vercel's Environment Variables (never in `.env` in the repo)
5. Redeploy
