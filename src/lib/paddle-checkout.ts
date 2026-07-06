/**
 * Client-side Paddle.js loader + checkout helpers.
 *
 * Environment variables (set in Lovable / .env):
 *   VITE_PADDLE_CLIENT_TOKEN   Paddle client-side token (starts with `live_` or `test_`)
 *   VITE_PADDLE_ENVIRONMENT    "production" | "sandbox"  (default: "production")
 *   VITE_PADDLE_PRICE_UNLIMITED_PLUS   price id for the $9 tier (pri_...)
 *   VITE_PADDLE_PRICE_INFINITY         price id for the $29 tier (pri_...)
 */

import type { Paddle, Environments, CheckoutOpenOptions } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

export function getPaddle(): Promise<Paddle | undefined> {
  if (paddlePromise) return paddlePromise;

  // Guard against SSR — Paddle.js touches `window` on init.
  if (typeof window === "undefined") {
    return Promise.resolve(undefined);
  }

  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined;
  if (!token) {
    console.warn("[paddle] VITE_PADDLE_CLIENT_TOKEN is not set — checkout will be disabled.");
    paddlePromise = Promise.resolve(undefined);
    return paddlePromise;
  }

  const environment = ((import.meta.env.VITE_PADDLE_ENVIRONMENT as string) ||
    "production") as Environments;

  paddlePromise = import("@paddle/paddle-js").then(({ initializePaddle }) =>
    initializePaddle({
      token,
      environment,
      eventCallback: (event) => {
        if (event?.name) {
          console.debug("[paddle:event]", event.name, event.data);
        }
      },
    }),
  );

  return paddlePromise;
}

export type CheckoutArgs = {
  priceId: string;
  userId?: string;
  email?: string;
  successUrl?: string;
  customData?: Record<string, string | number | boolean>;
};

/**
 * Open the Paddle Checkout overlay for a given price.
 * Returns a promise that resolves when the overlay is shown (not when it closes).
 * Subscription creation is confirmed via webhook — see /api/paddle-webhook.
 */
export async function openCheckout(args: CheckoutArgs): Promise<void> {
  const paddle = await getPaddle();
  if (!paddle) {
    throw new Error("Paddle is not initialized. Set VITE_PADDLE_CLIENT_TOKEN in your environment.");
  }

  const options: CheckoutOpenOptions = {
    items: [{ priceId: args.priceId, quantity: 1 }],
    settings: {
      displayMode: "overlay",
      theme: "dark",
      variant: "one-page",
      showAddDiscounts: true,
      allowLogout: false,
      ...(args.successUrl ? { successUrl: args.successUrl } : {}),
    },
    customData: {
      // used by the webhook handler to attach the subscription to the right user
      user_id: args.userId ?? "",
      ...(args.customData ?? {}),
    },
    ...(args.email ? { customer: { email: args.email } } : {}),
  };

  paddle.Checkout.open(options);
}

export function getPriceIdForTier(tierId: string): string | undefined {
  switch (tierId) {
    case "unlimited_plus":
      return import.meta.env.VITE_PADDLE_PRICE_UNLIMITED_PLUS as string | undefined;
    case "infinity":
      return import.meta.env.VITE_PADDLE_PRICE_INFINITY as string | undefined;
    default:
      return undefined;
  }
}
