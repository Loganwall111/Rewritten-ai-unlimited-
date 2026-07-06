
# Quantum Vista Verse — full-feature port

This project is currently the empty Lovable template. The `quantum-vista-verse-main` zip is the partial recent build, and the `base44` zip is the original with all the features you're missing. I'll bring both together into this project.

## 1. Foundation port (from `quantum-vista-verse-main`)

Bring over the complete app skeleton so the current blank template is replaced:

- `src/routes/__root.tsx` (real title/description, error/notfound boundaries)
- All routes: `index`, `chat`, `code`, `image`, `video`, `documents`, `history`, `prompts`, `web-research`, `game-builder`, `settings`, `billing`, plus new `auth/login`, `auth/register`, `auth/forgot-password`, `auth/reset-password`
- `AppShell`, `PortalSidebar`, `PageHero`, `FloatingMic`, `SiriOrb`, `BootScreen`
- `src/routes/api/chat.ts` (streaming Lovable AI chat)
- Supabase client + auth middleware, `models.ts`

## 2. Wormhole intro → Boot screen

New `WormholeIntro` component (WebGL/Canvas tunnel — spiraling streaks warping toward center, ~2.5s) that plays **before** `BootScreen`. Sequence on first load:
`WormholeIntro` → `BootScreen` → app. Stored in `sessionStorage` so it only plays once per session.

## 3. Auth (Lovable Cloud)

Enable Lovable Cloud, then:

- `profiles` table (id → auth.users, email, display_name, avatar_url) with RLS, trigger on signup
- Pages: Login, Register, Forgot Password, `/reset-password`
- Providers: Email/password + Google
- `_authenticated` layout route gates the main app; `/auth/*` and `/` are public
- Uses the AuthLayout visual style from base44 (dark, orb, gradient)

## 4. Real billing (Paddle, Lovable-managed)

- Run `recommend_payment_provider` for sanity, then `enable_paddle_payments`
- Create products via `batch_create_product`: Free, Pro (monthly), Ultra (monthly)
- `/billing` page: plan cards, current subscription, Paddle Checkout overlay
- Server route `/api/public/paddle-webhook` with signature verification, writes to `subscriptions` table (RLS)
- Entitlement helper `useSubscription()` for gating features

## 5. Background overhaul

Replace `BackgroundCreatures` with a layered scene rendered in `AnimatedBackground`:

- **Nebula** — kept from current (deep purples/blues, drifting clouds)
- **Black hole vortexes** — 3-5 spinning accretion-disk vortexes with gravitational lensing (shader-based swirl + chromatic ring). Scattered across the viewport, slow rotation.
- **3D whales** — 2 large low-poly whales (three.js `GLTF`-free primitive geometry with subdivided body + tail bones) that swim in slow bezier paths, tail undulation via vertex animation.
- **3D octopuses** — 2 (down from many) low-poly octopuses with 8 animated tentacles (procedural sine-wave bones), drifting.
- Uses `@react-three/fiber` + `@react-three/drei` in a transparent canvas layered over the CSS nebula.

## 6. Sound system

New `src/lib/sound.js` port from base44 with Web Audio synthesized SFX (no external files):

- Sidebar item hover/click, dock button press, modal open/close, toast, boot beeps, whale call (low sine), vortex hum (filtered noise ambient loop, very quiet)
- Global `SoundProvider` with mute toggle in Settings
- Wired into `PortalSidebar`, `FloatingMic`, `CommandDock`, every nav button

## 7. Click ripples

Port `ClickRipple` from base44 — global mount in `__root.tsx`, spawns an expanding cyan ring at every click coordinate. Respects `prefers-reduced-motion`.

## 8. Voice section fix

Two-tier TTS with automatic fallback:

- **Primary — ElevenLabs**: connect the ElevenLabs standard connector; server function `synthesizeSpeech` calls `/v1/text-to-speech/{voiceId}?output_format=mp3_44100_128` with the selected voice
- **Fallback — Lovable AI Gateway**: `openai/gpt-4o-mini-tts` via `/v1/audio/speech` (SSE streaming, PCM). Used automatically if ElevenLabs isn't connected
- Port `VoiceSelector` from base44 with the same voice list (Sarah, Charlie, George, Brian, etc.), preview button that actually plays
- Voice choice persisted per-user in `profiles.voice_id`
- Speak-response toggle in chat + FloatingMic uses the same pipeline

## 9. Fixes to known issues from the recent project

- Real head metadata (title, description, og tags) per route
- Missing route files created before any `<Link>` references them
- Placeholder homepage removed
- `.env` / connector env reads happen inside handlers, not module scope

## Technical details

**Stack:** TanStack Start (existing), TanStack Query, Lovable Cloud (Supabase), Paddle via Lovable Payments, ElevenLabs connector, Lovable AI Gateway, `three` + `@react-three/fiber` + `@react-three/drei` for 3D creatures, framer-motion for UI motion.

**Order of operations:**
1. Enable Lovable Cloud (needed for auth + subscriptions table)
2. Copy skeleton + routes + styles from QVV zip
3. Install deps: `three @react-three/fiber @react-three/drei @elevenlabs/react framer-motion motion @supabase/supabase-js`
4. Build wormhole, boot, ripple, sound, 3D background
5. Auth pages + `_authenticated` gate
6. Connect ElevenLabs (`standard_connectors--connect`), wire voice with fallback
7. Run `recommend_payment_provider` → `enable_paddle_payments` → create products → billing UI + webhook
8. Verify build; take a Playwright screenshot to confirm boot → intro → home → sidebar sounds

**What I'll need from you mid-build (unavoidable popups):**
- Approve the Lovable Cloud enable
- Approve the ElevenLabs connector connect
- Fill the Paddle enable form (email/business name)
- Approve creating Paddle products

Everything else runs in one pass.
