/**
 * Credit balance + credit spend server functions.
 * Balance is derived from the append-only credit_ledger table.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getCreditBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("credit_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { balance: data?.balance ?? 0 };
  });

export const getRecentLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("credit_ledger")
      .select("id, delta, reason, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return { entries: data ?? [] };
  });

const spendSchema = z.object({
  amount: z.number().int().positive().max(1000),
  reason: z.string().min(1).max(120),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Spend credits via service_role (RLS blocks direct writes). Fails if the
 * balance would go negative.
 */
export const spendCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => spendSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bal } = await supabaseAdmin
      .from("credit_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    const current = bal?.balance ?? 0;
    if (current < data.amount) {
      throw new Error(`Insufficient credits (have ${current}, need ${data.amount}).`);
    }
    const { error } = await supabaseAdmin.from("credit_ledger").insert({
      user_id: userId,
      delta: -data.amount,
      reason: data.reason,
      metadata: data.metadata ?? {},
    });
    if (error) throw new Error(error.message);
    return { ok: true, spent: data.amount, newBalance: current - data.amount };
  });
