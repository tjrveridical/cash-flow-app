CREATE OR REPLACE VIEW public.classified_cash_forecast_view AS
SELECT
  t.id AS transaction_id,
  COALESCE(
    er.description,
    t.metadata->>'qb_account_name',
    t.source_system
  ) AS display_label,
  (DATE_TRUNC('week', t.date) + INTERVAL '6 days')::date AS week_ending,
  CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END AS cash_in,
  CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END AS cash_out,
  t.amount AS net_total
FROM public.raw_transactions t
LEFT JOIN public.exclusion_rules er
  ON t.source_system = er.value  -- simplified; frontend filters handle display
WHERE t.amount <> 0;