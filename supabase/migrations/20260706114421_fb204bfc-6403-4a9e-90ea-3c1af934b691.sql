
DROP VIEW IF EXISTS public.credit_balances;
CREATE VIEW public.credit_balances WITH (security_invoker = true) AS
  SELECT user_id, COALESCE(SUM(delta), 0)::INTEGER AS balance
  FROM public.credit_ledger GROUP BY user_id;
GRANT SELECT ON public.credit_balances TO authenticated, service_role;
