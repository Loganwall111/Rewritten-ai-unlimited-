# Rewritten AI Unlimited

> **A lensed portal to every AI model** — chat, code, images, video, and voice, all warped through gravitational lenses, drifting whales, and spinning black holes.

<p align="center">
  <img alt="CI" src="https://github.com/Loganwall111/Rewritten-ai-unlimited-/actions/workflows/ci.yml/badge.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-strict-3178c6?logo=typescript&logoColor=white" />
  <img alt="Vercel" src="https://img.shields.io/badge/deploy-vercel-000000?logo=vercel&logoColor=white" />
  <img alt="Paddle" src="https://img.shields.io/badge/billing-paddle-2eb886" />
  <img alt="Supabase" src="https://img.shields.io/badge/db-supabase-3ecf8e?logo=supabase&logoColor=white" />
</p>

---

## ✨ What it does

Rewritten AI Unlimited is an immersive multi-model AI portal. Every screen is a fully-animated 3D environment — a dark sparkling sea of nebulae, god rays, and drifting light — through which the user navigates orb-shaped controls with a **grabber-arm cursor** that literally reaches out and taps them.

Behind the scenes it's a **TanStack Start** (React 19 + Vite + Nitro) app with **Supabase** auth/database, **Paddle Billing** subscriptions, and a **three-tier voice pipeline** (ElevenLabs → OpenAI TTS → smart-picked OS neural voice) that ensures the microphone never sounds robotic.

## 🎬 Highlights

| Surface | What happens |
|---|---|
| **Landing** (`/`) | Sign-in / Sign-up as glowing liquid orbs with sub-labels |
| **Wormhole intro** | 3-phase R3F cinematic: warp tunnel → orb approach → black-hole plunge |
| **Boot screen** | Rotating wireframe globe + concentric ring pulses + terminal readout with real-voice welcome ("Welcome to Rewritten AI Unlimited. All systems ready to go.") |
| **Tutorial** | 5-step spotlighted walkthrough with narration — fully skippable |
| **Home** (`/home`) | 9 tool tiles blooming from a wireframe center orb in a flower mandala |
| **Billing** (`/billing`) | Mandala of 6 petal orbs orbiting an Infinity center — real Paddle Checkout overlay + subscription webhooks |
| **Multiverse** (`/multiverse`) | Interactive black hole with GLSL accretion disk, gravitational-lens post-processing, drag-to-orbit + scroll-to-zoom camera, 14 AI-model planets, gravity wells, 3 discoverable secret galaxies, and a hidden Singularity pinch button |
| **Singularity** (`/singularity`) | Chat page that routes each query to the top-3 best-fit models in parallel and fuses their answers with Gemini 3 Flash |
| **Voice portal** (`/mic`) | Giant gravitational-lens-warped mic orb — ElevenLabs → Lovable AI → OS neural voice |

## 🪄 Interaction

- 🎯 **Grabber arms** — two glowing tentacles extend from the cursor toward the nearest orb
- 🌊 **Rich click ripples** — 3 concentric rings + 14 sparkle particles + water-drop sound
- ⚡ **Portal-dive** — every navigation plays a mini warp-tunnel burst centered on the click
- 🎨 **Proximity glow** — orbs brighten and lean toward the cursor within 260 px
- ⭐ **Constellation lines** — thin lines connect nearby orbs to the cursor
- ☄️ **Meteor tails** — fast cursor movement (>1200 px/s) spawns fading additive streaks + swoosh
- ✨ **Sparkle burst** on double-click — 30-particle explosion + 4-note chord
- 🎹 **⌘K palette** — fuzzy search over all routes + actions
- ⌨️ **Keyboard shortcuts** — G+H home, G+U multiverse, G+O singularity, G+M mic, G+B billing, G+S settings, ? for help
- 🎮 **6DOF fly-around** — drag to orbit, WASD to strafe, scroll wheel to dolly, spacebar to recenter
- 🎉 **Konami code** (↑↑↓↓←→←→BA) → rave mode + confetti + screen shake
- 🌌 **Time-of-day palette drift** — nebula hues shift with the real clock
- 🎙️ **Voice-reactive HUD** — ambient loop's energy pulses the corner indicator in real time

## 🌌 Ambient VFX (always on, every page)

- Nebula star field (280 stars, 3 color families, twinkling)
- 6 drifting nebula cloud blobs (parallax hue-shift, 12s pulse)
- Aurora ribbon at the top of the sky (hue-drift 40°)
- 14 god-ray light beams (each with own sway + flicker timers)
- 28 rising bubble motes (cyan + violet, additive)
- Top + bottom wave overlay with morphing bezier paths
- Caustic drift (SVG turbulence noise, 30s loop)
- Shooting stars (random meteors, ~1 every 3-8s)
- Stardust fall (60 slow sparkles)
- Distant lightning flashes (soft radial bloom, every 15-30s)
- Curved viewport bezel with 4 corner light nodes + orbiting bead
- Gravitational-lens bezel warp (SVG feTurbulence + feDisplacementMap on `backdrop-filter`)
- Chromatic prism edge split (cyan/magenta, 22s hue drift)
- 4 pulsing corner singularities + 4 traveling perimeter beads

## 🔊 Audio

Every SFX routes through a shared **master reverb + limiter bus** (procedural 1.6s IR).

- `sfxHover` — 1600→1400 Hz sine chirp on orb hover
- `sfxArmTap` — descending sine + noise, stereo-panned
- `sfxFocus` — hue-mapped triangle tone when arms lock on
- `sfxPortalBoom` — 70→180 Hz sub-bass whoomp + rising sparkle
- `sfxPlanetPing` — hue-mapped sine ping on planet click
- `sfxSparkleBurst` — 4-note chord (A5/C#6/E6/A6)
- `sfxSwipe` — bandpass noise whoosh on fast motion
- `sfxHorizonWhoomph` — deep sub-bass sweep when crossing the multiverse event horizon
- `sfxMeteor` — panned meteor whoosh
- `sfxTutorialNext`, `sfxBootChord`, `sfxArmExtend`, `sfxRipple`
- **Ambient loop** — 3 detuned sine pads (55/55.4/110 Hz) + 660 Hz triangle shimmer with LFO envelope + pink noise, all fed through a slow-sweeping low-pass filter + convolution reverb

## 🗣️ Realistic voice pipeline

Three tiers, falls through in order:

1. **ElevenLabs** neural voices (best — needs `ELEVENLABS_API_KEY`, free tier is 10k chars/mo)
2. **OpenAI TTS** via Lovable AI Gateway (needs `LOVABLE_API_KEY`)
3. **Best browser SpeechSynthesis voice** (always works) — a smart picker scores every installed voice (+100 for neural/online/enhanced, +60 for known-good cloud voices like Samantha, Google UK English Female, MS Aria Online; −80 for legacy junk) so users get real-sounding voice even without any API key configured

## 🛠️ Tech stack

- **React 19** + **TanStack Start** (SSR + server functions) + **TanStack Router**
- **Vite 8** + **Nitro** (Cloudflare / Vercel / Netlify / Node adapters)
- **Tailwind CSS 4** + **shadcn/ui** primitives
- **React Three Fiber** + **drei** + **@react-three/postprocessing** (WebGL scenes with custom GLSL shaders for the black hole and gravitational lens passes)
- **Framer Motion** (page transitions, orb blooms)
- **Supabase** (auth + Postgres with RLS + subscriptions table)
- **Paddle Billing v2** (Merchant of Record, checkout overlay + HMAC-verified webhooks)
- **Lovable AI Gateway** (unified access to Gemini 3, GPT-5, Nano Banana, Sora, Runway, Seedance)
- **ElevenLabs** (optional — top-tier TTS)
- Web Audio API (procedural SFX + reverb bus + analyser HUD)

## 🚀 Deploy

**One-click Vercel:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/Loganwall111/Rewritten-ai-unlimited-)

Full deploy guide — see [`DEPLOY_VERCEL.md`](./DEPLOY_VERCEL.md) for the env var list.

Paddle setup — see [`PADDLE_SETUP.md`](./PADDLE_SETUP.md).

### Deploy targets

The `vite.config.ts` auto-picks the right Nitro preset:

```bash
DEPLOY_TARGET=vercel      npm run build   # → .vercel/output/
DEPLOY_TARGET=cloudflare  npm run build   # → .output/server/ (wrangler deploy)
DEPLOY_TARGET=netlify     npm run build   # → .netlify/functions/
DEPLOY_TARGET=node        npm run build   # → .output/server/index.mjs
```

Vercel auto-sets `VERCEL=1` and Netlify auto-sets `NETLIFY=true`, so you don't need to specify `DEPLOY_TARGET` on those platforms.

## 🏃 Local development

```bash
git clone https://github.com/Loganwall111/Rewritten-ai-unlimited-.git
cd Rewritten-ai-unlimited-
cp .env.example .env      # fill in your keys
npm install
npm run dev
# → http://localhost:5173
```

### Required env vars (bare minimum)

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...            # anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # for the Paddle webhook to write subs
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
LOVABLE_API_KEY=lvbl_...                   # required for chat + Singularity + fallback TTS
```

### Recommended additions

```bash
# Realistic voice
ELEVENLABS_API_KEY=sk_...

# Paddle Billing (production)
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

## 📁 Project structure

```
src/
├── components/
│   ├── AppShell.tsx              global layer stack + boot phase
│   ├── AmbientToggle.tsx         floating orb to start the ambient loop
│   ├── BootScreen.tsx            wireframe globe + terminal readout
│   ├── ClickRipple.tsx           3-ring chromatic ripples with sound
│   ├── CommandPalette.tsx        ⌘K + keyboard shortcuts
│   ├── CreditTracker.tsx         top-right credits pill
│   ├── DelightLayer.tsx          confetti, shake, konami, welcome constellation
│   ├── FloatingMic.tsx           bottom-left mic orb (nav to /mic)
│   ├── FlowerBloom.tsx           N-petal ring layout primitive
│   ├── LiquidOrb.tsx             the core orb — plasma canvas + rim + halo + wireframe variant
│   ├── PageChrome.tsx            curved top nav bar (13 icons)
│   ├── PageHero.tsx              eyebrow pill + chromatic H1
│   ├── PlanOrb.tsx               billing plan orb wrapper
│   ├── PortalDive.tsx            720ms mini-wormhole on route change
│   ├── PortalSidebar.tsx         left + right sidebar orb navs
│   ├── SiriOrb.tsx               small conic-gradient orb (legacy)
│   ├── VoiceSelector.tsx         voice picker for the mic page
│   ├── WelcomeTutorial.tsx       real-voice welcome + 5-step spotlighted tour
│   ├── WormholeIntro.tsx         3-phase R3F cinematic
│   └── effects/                  atmospheric background layers
│       ├── AnimatedBackground.tsx    nebula stars + particles + drifting blobs
│       ├── BackgroundScene3D.tsx     R3F canvas: whales, black holes, dust, drag-orbit
│       ├── BezelLens.tsx             gravitational-lens border distortion
│       ├── Bubbles.tsx               rising sparkle motes
│       ├── CurvedChromeBar.tsx       glassy nav ribbon primitive
│       ├── CurvedViewport.tsx        rounded fishbowl bezel
│       ├── CursorSystem.tsx          grabber arms + comet trail + custom cursor
│       ├── GodRays.tsx               14 tapered light beams
│       ├── GravitationalLens.tsx     SVG feTurbulence + feDisplacementMap defs
│       ├── PerspectiveGrid.tsx       curved wireframe cage
│       ├── SkyLayer.tsx              shooting stars + stardust + lightning
│       └── WaveOverlay.tsx           top+bottom wave bands with caustic drift
├── routes/
│   ├── __root.tsx
│   ├── index.tsx                 /       landing
│   ├── auth.tsx                  /auth
│   ├── reset-password.tsx
│   ├── _authenticated/
│   │   ├── route.tsx             auth gate
│   │   ├── home.tsx              /home        flower of tool orbs
│   │   ├── billing.tsx           /billing     Paddle flower mandala
│   │   ├── mic.tsx               /mic         giant lensed mic orb
│   │   ├── multiverse.tsx        /multiverse  black hole + planets + galaxies
│   │   ├── singularity.tsx       /singularity fused-model chat
│   │   ├── chat.tsx / code.tsx / image.tsx / video.tsx / documents.tsx
│   │   ├── web-research.tsx / game-builder.tsx / prompts.tsx / history.tsx
│   │   └── settings.tsx
│   └── api/
│       ├── chat.ts               Lovable AI Gateway proxy
│       ├── images.ts             image generation
│       └── paddle-webhook.ts     HMAC-verified subscription events
├── lib/
│   ├── paddle-checkout.ts        client-side Paddle.js loader
│   ├── paddle.functions.ts       server: webhook verify, subscription CRUD, portal
│   ├── singularity.functions.ts  server: routing + parallel calls + fusion
│   ├── sound.ts                  40+ Web Audio SFX + ambient loop + master bus
│   ├── useVoice.ts               3-tier TTS hook
│   ├── browserVoice.ts           smart SpeechSynthesis voice picker
│   ├── audioBus.ts               shared AnalyserNode for reactive orbs
│   ├── useDragOrbit.ts           6DOF navigation state
│   ├── portalDive.ts             programmatic portal-dive events
│   └── models.ts                 canonical AI model catalog
├── integrations/supabase/        client + service-role + auth middleware
└── styles.css                    Tailwind + utility classes + keyframes
supabase/migrations/              subscriptions table + profiles + RLS
.github/workflows/ci.yml          type-check + lint + build on every push
```

## 🧪 Scripts

```bash
npm run dev       # vite dev server
npm run build     # production build (auto-picks Nitro preset)
npm run preview   # preview the production build
npm run lint      # eslint
npm run format    # prettier --write .
```

## 🔐 Security

- `.env` is gitignored — never commit secrets
- Paddle webhook signatures verified via HMAC-SHA256 with constant-time comparison
- Supabase RLS enforced on all user-scoped tables; the webhook uses a service-role client to bypass RLS only for subscription writes
- ElevenLabs / Lovable / Paddle keys are all server-side only — client sees only `VITE_PADDLE_CLIENT_TOKEN` (which is designed to be public)

## 📜 License

MIT — see [LICENSE](./LICENSE) (add one if you plan to open-source).

## 🙏 Credits

Built with [Lovable](https://lovable.dev), designed as an homage to visionOS + Interstellar. Every voice comes from your OS's neural TTS if no cloud key is configured — no cloud dependency required for the basic experience.
