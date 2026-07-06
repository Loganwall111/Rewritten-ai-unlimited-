import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side Paddle helpers.
 *
 * Required env vars:
 *   PADDLE_API_KEY               Server-side API key
 *   PADDLE_ENV                   "sandbox" | "production"  (defaults to production)
 *   PADDLE_WEBHOOK_SECRET        Notification secret from Paddle > Developer Tools > Notifications
 *   SUPABASE_URL                 (already set)
 *   SUPABASE_SERVICE_ROLE_KEY    Service role key — used by webhook to write subscriptions
 */

function paddleHost(): string {
  return process.env.PADDLE_ENV === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

function paddleHeaders(): HeadersInit {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is not configured");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/* ────────────────────── Read helpers ────────────────────── */

export const listPaddleProducts = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.PADDLE_API_KEY) {
    return { ok: false as const, error: "PADDLE_API_KEY is not configured" };
  }
  const res = await fetch(`${paddleHost()}/products?per_page=25`, {
    headers: paddleHeaders(),
  });
  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      error: (await res.text()).slice(0, 500),
    };
  }
  const json = (await res.json()) as {
    data?: Array<{ id: string; name: string; status: string }>;
  };
  return {
    ok: true as const,
    products: json.data?.map((p) => ({ id: p.id, name: p.name, status: p.status })) ?? [],
  };
});

/**
 * Fetch the current user's active subscription record from Supabase.
 * The row is populated/updated by the /api/paddle-webhook endpoint.
 */
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select("tier,status,paddle_subscription_id,current_period_end")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, subscription: data };
  });

/**
 * Generate a Paddle customer-portal URL so users can manage / cancel their sub.
 * Called from the billing page's "Manage subscription" button.
 */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!process.env.PADDLE_API_KEY) {
      return { ok: false as const, error: "PADDLE_API_KEY not configured" };
    }

    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("paddle_customer_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const customerId = sub?.paddle_customer_id;
    if (!customerId) {
      return { ok: false as const, error: "no_paddle_customer" };
    }

    const res = await fetch(`${paddleHost()}/customers/${customerId}/portal-sessions`, {
      method: "POST",
      headers: paddleHeaders(),
    });
    if (!res.ok) {
      return {
        ok: false as const,
        error: (await res.text()).slice(0, 300),
      };
    }
    const json = (await res.json()) as {
      data?: { urls?: { general?: { overview?: string } } };
    };
    return {
      ok: true as const,
      url: json.data?.urls?.general?.overview ?? null,
    };
  });

/* ────────────────────── Webhook helpers (used by /api/paddle-webhook) ────────────────────── */

/**
 * Verify a Paddle webhook using the HMAC-SHA256 signature scheme.
 * Header format: `ts=<unix>;h1=<hex>`.  Signed payload: `<ts>:<raw body>`.
 */
export async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx), p.slice(idx + 1)];
    }),
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}:${rawBody}`));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (hex.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ h1.charCodeAt(i);
  return diff === 0;
}

/**
 * Service-role Supabase client for the webhook (bypasses RLS to write subs).
 * Not exported to any client bundle — this file is server-only in TanStack Start
 * because it's referenced only from server functions and the api route.
 */
export function getServiceSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for webhook processing",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Map a Paddle price ID → internal tier slug used in the `subscriptions.tier` column.
 * Extend this table as you add plans.
 */
export function tierFromPriceId(priceId: string | undefined | null): string {
  if (!priceId) return "unlimited";
  if (priceId === process.env.PADDLE_PRICE_UNLIMITED_PLUS) return "unlimited_plus";
  if (priceId === process.env.PADDLE_PRICE_INFINITY) return "infinity";
  return "unlimited";
}
