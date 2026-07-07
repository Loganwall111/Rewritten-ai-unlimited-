# 🚀 Rewritten AI Unlimited — Deploy Quickstart

This zip contains the **complete, ready-to-deploy** source for the app.
Everything is included — the World cinematic, MASSG OS, MASSG Awakening,
Multiverse, Singularity, Paddle billing, Supabase auth, voice tutorial,
grabber-arm cursor, all VFX layers, and every route.

Node modules are **not** included (they're huge). You install them once.

---

## ⚡ Option A — Deploy to Vercel in ~3 minutes (recommended)

1. **Unzip** this file anywhere on your computer.
2. Go to **https://vercel.com/new** → drag the unzipped folder onto the page
   (or use "Import Git Repository" if you push it to GitHub first).
3. When Vercel asks about **Environment Variables**, add these 6:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://jwiekgybiqnlnsgqapya.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | *(paste your Supabase anon key)* |
   | `SUPABASE_URL` | *(same as VITE_SUPABASE_URL)* |
   | `SUPABASE_PUBLISHABLE_KEY` | *(same as VITE_SUPABASE_PUBLISHABLE_KEY)* |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(from Supabase → Project Settings → API)* |
   | `PADDLE_API_KEY` | *(your live Paddle API key)* |

   Optional (unlocks extra features):
   - `VITE_PADDLE_CLIENT_TOKEN` — enables checkout in browser
   - `ELEVENLABS_API_KEY` — enables ultra-realistic voice narration
   - `OPENAI_API_KEY` — tier-2 fallback voice + AI features
   - `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini models

   💡 **Tip:** If the Vercel value textarea won't accept long JWTs,
   use "Import .env" (drag the included `.env.example` after filling it in),
   or run `vercel env add SUPABASE_PUBLISHABLE_KEY production` from the CLI.

4. Click **Deploy**. Wait ~2 minutes. Done.

---

## ⚡ Option B — Push to GitHub, then Vercel

```bash
cd rewritten-ai-ready
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Then in Vercel: **New Project → Import Git Repository → pick your repo**.
Add the env vars from Option A step 3.

---

## 🖥️ Option C — Run locally first (to check it works)

```bash
cd rewritten-ai-ready
npm install          # or: bun install
cp .env.example .env # fill in your keys
npm run dev          # opens on http://localhost:5173
```

---

## 🔐 IMPORTANT — Rotate compromised keys

Any Paddle key or GitHub PAT you've pasted in chat should be **rotated
immediately** before deploying:

- **Paddle:** Vendor Dashboard → Developer Tools → Authentication → revoke + create new
- **GitHub PAT:** github.com/settings/tokens → revoke old → create new

Then use the new values in your env vars.

---

## 📁 What's inside

```
rewritten-ai-ready/
├── src/
│   ├── routes/              # 20+ TanStack Router routes (incl. /world /os /awakening)
│   ├── components/          # 30+ React components (LiquidOrb, CursorSystem, etc.)
│   ├── lib/                 # sound, voice, models, Paddle, Singularity routing
│   ├── integrations/supabase/  # auth + DB client
│   └── styles.css           # Tailwind 4
├── public/                  # static assets
├── supabase/                # migrations
├── .github/workflows/ci.yml # (already passing)
├── vite.config.ts           # multi-preset (Vercel/Netlify/Cloudflare/Node)
├── package.json
└── README.md                # full feature table
```

---

## 🎯 Once deployed, verify these routes work:

- `/` — landing
- `/auth` — sign in / sign up
- `/home` — main tool orb flower (after login)
- `/world` — 6-phase cinematic hub
- `/os` — MASSG OS voxel desktop
- `/awakening` — voxel Minecraft with fixed world gen
- `/multiverse` — black hole + planets
- `/singularity` — fused-model chat
- `/billing` — Paddle mandala

If any route shows "Signal lost", append `?debug=1` to the URL to see the
exact error. 99% of the time it's a missing env var.

---

Built by Arena.ai's Agent Mode. Have fun. 🌌
