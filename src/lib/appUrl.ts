/**
 * Canonical public origin for auth redirects (email confirm, password reset,
 * OAuth callback). Prefer an explicit env var so confirmation emails never
 * point at localhost when the Supabase project Site URL is still set to
 * http://localhost:5173.
 *
 * Priority:
 *   1. VITE_SITE_URL / VITE_APP_URL (build-time, production domain)
 *   2. window.location.origin (browser runtime)
 *   3. empty string (SSR — callers should only use this in the browser)
 */
export function getAppOrigin(): string {
  const fromEnv =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_SITE_URL || import.meta.env?.VITE_APP_URL)) ||
    (typeof process !== "undefined" &&
      (process.env?.VITE_SITE_URL || process.env?.VITE_APP_URL || process.env?.SITE_URL));

  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
}

/** Public auth callback — always reachable without a session. */
export function getAuthCallbackUrl(next = "/home"): string {
  const origin = getAppOrigin();
  const path = `/auth/callback?next=${encodeURIComponent(next)}`;
  return origin ? `${origin}${path}` : path;
}

/** True when the current URL carries Supabase auth tokens (hash or code). */
export function urlHasAuthParams(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash?.replace(/^#/, "") ?? "";
  const search = window.location.search?.replace(/^\?/, "") ?? "";
  const combined = `${hash}&${search}`;
  return (
    /(?:^|&)(access_token|refresh_token|code|type|error|error_description)=/.test(combined) ||
    /(?:^|&)type=(signup|invite|recovery|magiclink|email_change|email)=/.test(combined)
  );
}
