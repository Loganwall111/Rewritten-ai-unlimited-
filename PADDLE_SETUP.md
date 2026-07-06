# Paddle Billing + 3D Rework — Setup Guide

This branch adds two big changes to the project:

1. **Real Paddle Billing** on `/billing` (checkout overlay, webhook-synced
   subscriptions, self-serve customer portal).
2. **Fully interactive 3D world** — the whole scene is now draggable with the
   mouse, wrapped in a GLSL gravitational-lens post-processing pass, bloom,
   chromatic aberration, dust particles, and a starfield. UI panels tilt with
   the world.

---

## 1. Paddle setup (10 minutes)

### 1a. Create the products & prices

1. Sign in to [vendors.paddle.com](https://vendors.paddle.com) (or `sandbox-vendors.paddle.com` for testing).
2. **Catalog → Products → New product**. Create two:
   - `Unlimited+` — recurring, $9 USD / month
   - `Infinity` — recurring, $29 USD / month
3. For each product, add a **Price**. Copy the price IDs — they start with `pri_01...`.

### 1b. Get your keys

- **Client-side token**: Developer Tools → **Authentication** → *Client-side tokens* → Generate. Starts with `live_` (production) or `test_` (sandbox).
- **API key**: Developer Tools → **Authentication** → *API keys* → Generate. Starts with `pdl_live_apikey_` / `pdl_sdbx_apikey_`.
- **Webhook secret**: Developer Tools → **Notifications** → *New destination*. URL: `https://YOUR-DOMAIN/api/paddle-webhook`. Subscribe to events:
  - `subscription.created`
  - `subscription.updated`
  - `subscription.activated`
  - `subscription.canceled`
  - `subscription.past_due`
  - `transaction.completed`
  After saving, copy the **secret** it displays. Starts with `pdl_ntfset_`.

### 1c. Approved domains (production only)

Paddle Checkout must be initialised from a domain you've approved. Add your production origin under **Checkout → Domains**. Localhost is allowed by default.

### 1d. Fill in `.env`

Copy `.env.example` to `.env` and paste your values in. **Restart `bun dev`** — Vite only re-reads `VITE_*` vars on restart.

### 1e. Supabase service role key

The webhook writes to the `subscriptions` table via the service-role key (bypasses RLS). Grab it from Supabase → *Project settings → API → service_role secret* and set `SUPABASE_SERVICE_ROLE_KEY=...`.

### 1f. Test the flow

1. Sign in to the app.
2. Go to `/billing`. The checkout buttons on **Unlimited+** and **Infinity** should be enabled (no amber warning at the bottom).
3. Click one → Paddle overlay opens → complete with a Paddle test card (`4000 0566 5566 5556`, any expiry/CVC, sandbox only).
4. Within a few seconds you should see the toast "Payment received — activating your plan…" and the "Currently on" pill flips to the new tier.
5. Verify in Supabase → Table editor → `subscriptions` that the row was upserted.
6. "Manage subscription" opens the Paddle customer portal in a new tab.

### 1g. Local webhook testing

Paddle can't POST to `localhost`. Options:

- **ngrok**: `ngrok http 3000`, put the https URL in the Paddle notification destination.
- **Skip webhook locally**: the UI still opens checkout, but subscription status won't sync until deployed with the webhook wired up.

---

## 2. 3D rework — what changed

| Feature | Where |
| --- | --- |
| Drag-to-orbit camera | `src/lib/useDragOrbit.ts` — module-level singleton shared by R3F + DOM |
| Full-screen gravitational-lens shader | `GravitationalLensPass` in `BackgroundScene3D.tsx` |
| Bloom / chromatic aberration / vignette / noise | `<EffectComposer>` in `BackgroundScene3D.tsx` |
| Starfield + dust particles | `<Stars />` + `DustField` |
| DOM parallax + 3D tilt on main content | `AppShell.tsx` RAF loop |
| Glass panel beveled edges + tilt-3d hover | `src/styles.css` |
| "Drag anywhere to warp the field" hint | `DragHint` in `AppShell.tsx` (auto-dismisses after 5s, once per session) |

### Interacting with the world

- **Drag anywhere on the page** (that isn't a button/input) → camera orbits, whole UI tilts.
- **Hover a plan card** → 3D-tilt lift with cyan/violet glow.
- **Move mouse without dragging** → subtle hover parallax.
- Respects `prefers-reduced-motion` — post-processing + tilts are disabled for users who've opted out.

### Performance

- DPR clamped at 1.75.
- Multisampling disabled in the composer (bloom does its own).
- Stars & dust fields use additive blending on `points`, no per-frame allocations.
- If you hit FPS issues on integrated GPUs, remove the `<ChromaticAberration />` and `<Noise />` passes first — they're the cheapest to lose.

---

## 3. Files added / changed

**Added**
- `src/lib/paddle.client.ts` — Paddle.js loader + `openCheckout()`
- `src/lib/useDragOrbit.ts` — shared drag state
- `src/routes/api/paddle-webhook.ts` — signed webhook receiver
- `.env.example`
- `PADDLE_SETUP.md` (this file)

**Rewritten**
- `src/routes/_authenticated/billing.tsx` — real Paddle checkout, current-plan strip, "Manage subscription" portal button
- `src/lib/paddle.functions.ts` — added `getMySubscription`, `createPortalSession`, `verifyPaddleSignature`, `getServiceSupabase`, `tierFromPriceId`
- `src/components/effects/BackgroundScene3D.tsx` — drag-orbit camera + post-processing + starfield + particles
- `src/components/AppShell.tsx` — DOM parallax + drag hint
- `src/styles.css` — glass bevels, tilt-3d, cursor affordances

**Dependencies added**
- `@paddle/paddle-js`
- `@react-three/postprocessing`
- `postprocessing`
