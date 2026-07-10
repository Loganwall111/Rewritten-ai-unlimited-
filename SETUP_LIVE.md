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
VITE_SITE_URL=https://YOUR-VERCEL-DOMAIN.vercel.app
# ↑ CRITICAL for email confirm + Google OAuth. Without it, confirmation
#   emails can point at http://localhost:5173 and users get "page not found".
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

## 2. Configure Supabase Auth URLs (REQUIRED for email + Google)

Emails and Google OAuth only work when Supabase knows your **live** domain.

1. Open **Supabase → Authentication → URL Configuration**
2. **Site URL**: set to your production domain
   - e.g. `https://rewritten-ai-unlimited.vercel.app` (or your custom domain)
   - **Do NOT leave this as `http://localhost:5173`** — that is exactly what
     causes "localhost page not found" when users click confirmation emails.
3. **Redirect URLs** — add every origin you use, with a wildcard path:
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/**`
   - `https://YOUR-CUSTOM-DOMAIN/**` (if any)
   - `http://localhost:5173/**` (for local dev only)
   - At minimum include: `https://YOUR-DOMAIN/auth/callback`
4. **Google provider** (for "Continue with Google"):
   - Supabase → Authentication → Providers → **Google** → enable
   - Paste your Google Cloud OAuth Client ID + Secret
   - In Google Cloud Console → Credentials → your OAuth client, add the
     authorized redirect URI shown in the Supabase Google provider panel
     (looks like `https://YOUR-PROJECT.supabase.co/auth/v1/callback`)

After changing Site URL / Redirect URLs you do **not** need to redeploy the
app — only the next email / OAuth attempt uses the new values. But
`VITE_SITE_URL` *does* need a redeploy (it's baked into the client bundle).

### Why sign-in was broken (what this release fixed in code)

| Symptom | Cause | Fix in this release |
|---|---|---|
| Google → "AIR 404" / page not found | App only used Lovable's `/~oauth/initiate` broker, which only exists on Lovable hosts | Falls back to native Supabase Google OAuth + lands on `/auth/callback` |
| Email confirm → localhost "page not found" | Supabase Site URL still `http://localhost:5173`, and app redirected to gated `/home` | Redirects go to public `/auth/callback`; set `VITE_SITE_URL` + Supabase Site URL to your live domain |
| Session established but still can't enter | Auth gate raced the hash/token parser | `/auth/callback` waits for the session, then navigates to `/home` |

---

## 3. Turn off Vercel Deployment Protection (so the public can visit)

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
