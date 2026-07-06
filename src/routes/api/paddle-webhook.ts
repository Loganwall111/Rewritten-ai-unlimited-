import { createFileRoute } from "@tanstack/react-router";
import { verifyPaddleSignature, getServiceSupabase, tierFromPriceId } from "@/lib/paddle.functions";

/**
 * Paddle Billing webhook receiver.
 *
 * Configure in Paddle dashboard → Developer Tools → Notifications:
 *   URL:    https://<your-domain>/api/paddle-webhook
 *   Events: subscription.created, subscription.updated, subscription.canceled,
 *           subscription.past_due, transaction.completed
 *
 * The secret shown after creating the notification destination must be exposed
 * to the server as PADDLE_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/paddle-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PADDLE_WEBHOOK_SECRET;
        if (!secret) {
          return json({ error: "webhook_not_configured" }, 500);
        }

        const raw = await request.text();
        const signature = request.headers.get("paddle-signature");
        const ok = await verifyPaddleSignature(raw, signature, secret);
        if (!ok) return json({ error: "bad_signature" }, 401);

        let event: PaddleEvent;
        try {
          event = JSON.parse(raw);
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        try {
          await handleEvent(event);
        } catch (err) {
          console.error("[paddle-webhook] handler error", err);
          return json({ error: "handler_failed" }, 500);
        }

        return json({ ok: true });
      },

      // GET returns a health-check so you can hit the URL in a browser to
      // confirm the route is deployed.
      GET: async () =>
        json({
          ok: true,
          hint: "POST Paddle webhooks here. Set PADDLE_WEBHOOK_SECRET.",
        }),
    },
  },
});

/* ─────────────────────────── handler ─────────────────────────── */

type PaddleEvent = {
  event_type: string;
  data: {
    id?: string;
    customer_id?: string;
    status?: string;
    current_billing_period?: { ends_at?: string };
    items?: Array<{ price?: { id?: string } }>;
    custom_data?: { user_id?: string } | null;
    subscription_id?: string;
  };
};

async function handleEvent(event: PaddleEvent) {
  const supabase = getServiceSupabase();

  switch (event.event_type) {
    case "subscription.created":
    case "subscription.updated":
    case "subscription.activated":
    case "subscription.resumed":
    case "subscription.past_due": {
      const d = event.data;
      const userId = d.custom_data?.user_id;
      if (!userId) {
        console.warn("[paddle-webhook] missing custom_data.user_id");
        return;
      }
      const priceId = d.items?.[0]?.price?.id;
      const tier = tierFromPriceId(priceId);
      const status = d.status ?? "active";
      const periodEnd = d.current_billing_period?.ends_at ?? null;

      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          tier,
          status,
          paddle_subscription_id: d.id,
          paddle_customer_id: d.customer_id,
          current_period_end: periodEnd,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      return;
    }

    case "subscription.canceled": {
      const d = event.data;
      if (!d.id) return;
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "canceled", tier: "unlimited" })
        .eq("paddle_subscription_id", d.id);
      if (error) throw error;
      return;
    }

    case "transaction.completed":
      // One-shot payment logging hook — no-op for now.
      return;

    default:
      console.log("[paddle-webhook] ignoring", event.event_type);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
