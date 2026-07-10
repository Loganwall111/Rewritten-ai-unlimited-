# Custom domain on Vercel

Once you've deployed to Vercel and it's live at `https://your-project.vercel.app`, hooking up a real domain like `rewritten.ai` (or a subdomain like `app.rewritten.ai`) takes about 3 minutes.

## Step 1 · Buy or point a domain

If you don't have one, buy from any registrar — Cloudflare, Namecheap, Porkbun are all fine.

If you already own one, you'll do the DNS config either at your registrar OR (recommended) delegate it to Vercel's nameservers so it manages everything for you.

## Step 2 · Add the domain in Vercel

1. Go to your project → **Settings → Domains**
2. Type your domain (e.g. `rewritten.ai` or `app.rewritten.ai`) → **Add**
3. Vercel will show DNS records it needs — usually one of:
   - **A record** pointing `@` to `76.76.21.21` (for apex domains)
   - **CNAME record** pointing your subdomain to `cname.vercel-dns.com`

## Step 3 · Configure DNS at your registrar

### Option A — Apex domain (`rewritten.ai`)

Add these records at your registrar:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `76.76.21.21` | Auto |
| CNAME | `www` | `cname.vercel-dns.com` | Auto |

Vercel will automatically redirect `www.rewritten.ai` → `rewritten.ai` (or vice versa, your choice).

### Option B — Subdomain (`app.rewritten.ai`)

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `app` | `cname.vercel-dns.com` | Auto |

### Option C — Cloudflare-managed domain (easiest, best perf)

If your domain is on Cloudflare:

1. Cloudflare dashboard → your domain → **DNS**
2. Add the records above
3. Set proxy status to **DNS only** (grey cloud, NOT the orange cloud) — Vercel handles SSL and needs to see the real IP
4. Alternatively: use Cloudflare + Vercel's [official Cloudflare integration](https://vercel.com/docs/cloudflare)

## Step 4 · Wait for DNS + SSL

- DNS usually propagates in 1–5 minutes with modern providers
- Vercel automatically provisions a **Let's Encrypt SSL certificate** as soon as it can resolve your domain — typically <60 seconds after DNS is live
- The Domains page will flip from "Invalid Configuration" → "Valid Configuration" → green ✓

Refresh the page every 30 seconds until it goes green.

## Step 5 · Update Paddle for the new domain

**Critical** — Paddle Checkout requires an explicit domain allowlist.

1. Paddle dashboard → **Checkout → Domains**
2. Add your custom domain: `rewritten.ai` (or the subdomain you used)
3. Save

Without this, the Checkout overlay refuses to load on your domain (silent failure — no console error).

## Step 6 · Update the Paddle webhook URL

1. Paddle → **Developer Tools → Notifications**
2. Edit your existing notification destination
3. Update the URL from `https://your-project.vercel.app/api/paddle-webhook` to `https://YOUR-CUSTOM-DOMAIN/api/paddle-webhook`
4. Save

The webhook secret stays the same — no need to change your Vercel env var.

## Step 7 · Update any Supabase auth redirect URLs

If you're using Supabase Auth with OAuth (e.g. Google sign-in) or email confirmation:

1. Supabase → **Authentication → URL Configuration**
2. **Site URL**: `https://YOUR-CUSTOM-DOMAIN`
   - Leaving this as `http://localhost:5173` is the #1 cause of "localhost page not found" when users click confirmation emails.
3. **Redirect URLs**: add:
   - `https://YOUR-CUSTOM-DOMAIN/**`
   - `https://YOUR-CUSTOM-DOMAIN/auth/callback` (the app's public auth landing)
4. In Vercel env vars set `VITE_SITE_URL=https://YOUR-CUSTOM-DOMAIN` and redeploy — this is what the app embeds into email/OAuth redirect links.

## Step 8 · Verify end-to-end

1. Visit `https://YOUR-CUSTOM-DOMAIN` — should load with green padlock
2. Sign in via `/auth`
3. Go to `/billing` → click a paid tier → Paddle overlay loads (if not, check step 5)
4. Complete a test purchase → within seconds the "Currently on" pill should update (proves the webhook is firing on the new domain)

---

## Advanced: multiple environments

Vercel gives you a preview URL for every git branch. Common setup:

| Branch | URL |
|---|---|
| `main` | `rewritten.ai` (production) |
| `staging` | `staging.rewritten.ai` (staging env, sandbox Paddle) |
| Any PR | `xyz-pr-42-yourname.vercel.app` (auto-preview) |

For staging with a separate Paddle sandbox account:
1. In Vercel → Settings → Environment Variables → set variables scoped to the **Preview** environment (not Production)
2. Use `PADDLE_ENV=sandbox`, sandbox keys, sandbox price IDs
3. Match with a sandbox webhook destination pointing at `staging.rewritten.ai/api/paddle-webhook`

---

## Troubleshooting

**"DNS check failed" in Vercel**
- Wait 5 minutes; DNS caches are stubborn
- Verify records at [dnschecker.org](https://dnschecker.org)
- Cloudflare users: proxy must be **DNS only** (grey cloud)

**Certificate stuck on "Issuing"**
- Vercel needs an unproxied DNS record to complete the Let's Encrypt challenge
- If using Cloudflare, temporarily grey-cloud the record until SSL provisions, then you can proxy again if needed

**Paddle Checkout does nothing on the custom domain**
- Check the browser console for `Refused to display in a frame` or similar
- Fix: go add the domain in Paddle → Checkout → Domains (step 5)

**OAuth redirect loops or errors**
- Update the redirect URL in the OAuth provider (Google Console, etc.) AND in Supabase Auth → URL Configuration
- Both must match the new custom domain

**Webhooks still hitting the vercel.app URL**
- You forgot step 6 — update the notification URL in Paddle
- Old URL will still work (Vercel keeps the vercel.app URL alive) but you probably want everything on one domain for consistency

---

## Domain registrar suggestions

- **Cloudflare Registrar** — sells at cost, includes free DNS + WHOIS privacy. `.ai` is expensive (~$70/yr) but not with Cloudflare's markup.
- **Porkbun** — cheap, clean UI, includes WHOIS privacy
- **Namecheap** — mainstream, fine

Avoid GoDaddy — pricing games, upsells on every screen.
