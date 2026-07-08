# ⚡ Making the live site actually work

The deploy succeeded, but the app needs **two manual steps in Vercel** before
sign-in / voice / billing work. (The Babylon landing + hub work with **zero**
config — those render immediately.)

---

## 1. Add your environment variables (REQUIRED for auth/voice/billing)

Your `.env` file is **gitignored** — it only works on your own machine and
**does not deploy to Vercel**. You must enter each key into Vercel by hand:

**Vercel → your project → Settings → Environment Variables → Add New**

Add every variable below (mark them all for **Production + Preview + Development**):

### Required (bare minimum — sign-in + chat)

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...           (Supabase anon/publishable key)
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...               (service role — for webhooks)
LOVABLE_API_KEY=lvbl_...                        (chat + Singularity + fallback TTS)
```

### Recommended (realistic voice + billing)

```
ELEVENLABS_API_KEY=sk_...                       (top-tier voice)
PADDLE_API_KEY=pdl_live_apikey_...
PADDLE_ENV=production
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
PADDLE_PRICE_UNLIMITED_PLUS=pri_01...
PADDLE_PRICE_INFINITY=pri_01...
VITE_PADDLE_CLIENT_TOKEN=live_...
VITE_PADDLE_ENVIRONMENT=production
VITE_PADDLE_PRICE_UNLIMITED_PLUS=pri_01...
VITE_PADDLE_PRICE_INFINITY=pri_01...
```

### Where to get the keys

| Key | Where to find it |
|---|---|
| Supabase `VITE_SUPABASE_*`, `SUPABASE_*`) | Your Supabase dashboard → Project Settings → API. Or copy from your **Lovable** project's env. |
| `LOVABLE_API_KEY` | Your Lovable project settings. |
| `ELEVENLABS_API_KEY` | ElevenLabs dashboard (free tier = 10k chars/mo). |
| Paddle `PADDLE_*`) | Paddle sandbox/production dashboard. |

> **The keys are likely already in your Lovable project.** Open Lovable → your
> project → Settings → Environment variables, and copy each one into Vercel.

**After adding them, redeploy:** Vercel → Deployments → the latest → ⋯ → Redeploy.
`VITE_` vars are baked in at **build** time, so they need a fresh build.)

---

## 2. Turn off Vercel Deployment Protection (so the public can visit)

The deploy is currently behind a **Vercel SSO login wall** — visitors get
redirected to `vercel.com/login`.

**Vercel → your project → Settings → Deployment Protection → turn it OFF**
(or set to "Only Production Deployments" / "Standard Protection" off).

After this, the live URL is openly visitable.

---

## What works WITHOUT any config

- ✅ The Babylon **landing** `/`) — glowing icosphere + nebula
- ✅ The Babylon **hub** `/world`) — 12 clickable doors
- ✅ The **cinematic scenes** gallery `/scenes`) — *if* you reach it (it's under
  `/_authenticated`, so it needs sign-in; see step 1)

If you want the scenes reachable **without** login too, say the word and I'll
lift them out of the auth gate.
