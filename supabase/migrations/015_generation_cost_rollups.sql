-- Phase 9b: daily cost/revenue rollups for pricing and margin analytics

CREATE TABLE IF NOT EXISTS public.generation_cost_daily_rollups (
  day DATE PRIMARY KEY,
  total_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  total_revenue_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  total_credits_sold INTEGER NOT NULL DEFAULT 0,
  total_refunded_credits INTEGER NOT NULL DEFAULT 0,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  paid_orders INTEGER NOT NULL DEFAULT 0,
  cost_per_credit_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  revenue_per_credit_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  gross_margin_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  margin_percent NUMERIC(7, 4) NOT NULL DEFAULT 0,
  refreshed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.generation_cost_daily_rollups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client reads for daily rollups" ON public.generation_cost_daily_rollups
  FOR SELECT USING (FALSE);

CREATE OR REPLACE FUNCTION public.refresh_generation_cost_daily_rollups(
  p_days INTEGER DEFAULT 30,
  p_inr_to_usd NUMERIC DEFAULT 83
)
RETURNS INTEGER AS $$
DECLARE
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_inr_to_usd NUMERIC := CASE WHEN COALESCE(p_inr_to_usd, 0) > 0 THEN p_inr_to_usd ELSE 83 END;
BEGIN
  WITH days AS (
    SELECT generate_series(
      CURRENT_DATE - (v_days - 1),
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE AS day
  ),
  costs AS (
    SELECT
      DATE(created_at) AS day,
      COALESCE(SUM(estimated_cost_usd), 0)::NUMERIC(14, 6) AS total_cost_usd
    FROM public.generation_cost_events
    WHERE created_at >= (CURRENT_DATE - (v_days - 1))
    GROUP BY DATE(created_at)
  ),
  sales AS (
    SELECT
      DATE(created_at) AS day,
      COALESCE(SUM(credits), 0)::INTEGER AS total_credits_sold,
      COALESCE(SUM(
        CASE
          WHEN UPPER(currency) = 'USD' THEN amount_subunits::NUMERIC / 100
          WHEN UPPER(currency) = 'INR' THEN (amount_subunits::NUMERIC / 100) / v_inr_to_usd
          ELSE 0
        END
      ), 0)::NUMERIC(14, 6) AS total_revenue_usd,
      COUNT(*)::INTEGER AS paid_orders
    FROM public.payment_orders
    WHERE status = 'paid'
      AND created_at >= (CURRENT_DATE - (v_days - 1))
    GROUP BY DATE(created_at)
  ),
  refunds AS (
    SELECT
      DATE(created_at) AS day,
      COALESCE(SUM(refunded_amount), 0)::INTEGER AS total_refunded_credits
    FROM public.generation_job_refunds
    WHERE created_at >= (CURRENT_DATE - (v_days - 1))
    GROUP BY DATE(created_at)
  ),
  jobs AS (
    SELECT
      DATE(created_at) AS day,
      COUNT(*)::INTEGER AS total_jobs,
      COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_jobs,
      COUNT(*) FILTER (WHERE status = 'failed')::INTEGER AS failed_jobs
    FROM public.generation_jobs
    WHERE created_at >= (CURRENT_DATE - (v_days - 1))
    GROUP BY DATE(created_at)
  ),
  assembled AS (
    SELECT
      d.day,
      COALESCE(c.total_cost_usd, 0)::NUMERIC(14, 6) AS total_cost_usd,
      COALESCE(s.total_revenue_usd, 0)::NUMERIC(14, 6) AS total_revenue_usd,
      COALESCE(s.total_credits_sold, 0)::INTEGER AS total_credits_sold,
      COALESCE(r.total_refunded_credits, 0)::INTEGER AS total_refunded_credits,
      COALESCE(j.total_jobs, 0)::INTEGER AS total_jobs,
      COALESCE(j.completed_jobs, 0)::INTEGER AS completed_jobs,
      COALESCE(j.failed_jobs, 0)::INTEGER AS failed_jobs,
      COALESCE(s.paid_orders, 0)::INTEGER AS paid_orders
    FROM days d
    LEFT JOIN costs c ON c.day = d.day
    LEFT JOIN sales s ON s.day = d.day
    LEFT JOIN refunds r ON r.day = d.day
    LEFT JOIN jobs j ON j.day = d.day
  )
  INSERT INTO public.generation_cost_daily_rollups (
    day,
    total_cost_usd,
    total_revenue_usd,
    total_credits_sold,
    total_refunded_credits,
    total_jobs,
    completed_jobs,
    failed_jobs,
    paid_orders,
    cost_per_credit_usd,
    revenue_per_credit_usd,
    gross_margin_usd,
    margin_percent,
    refreshed_at
  )
  SELECT
    a.day,
    a.total_cost_usd,
    a.total_revenue_usd,
    a.total_credits_sold,
    a.total_refunded_credits,
    a.total_jobs,
    a.completed_jobs,
    a.failed_jobs,
    a.paid_orders,
    CASE
      WHEN a.total_credits_sold > 0 THEN ROUND(a.total_cost_usd / a.total_credits_sold, 6)
      ELSE 0
    END AS cost_per_credit_usd,
    CASE
      WHEN a.total_credits_sold > 0 THEN ROUND(a.total_revenue_usd / a.total_credits_sold, 6)
      ELSE 0
    END AS revenue_per_credit_usd,
    ROUND(a.total_revenue_usd - a.total_cost_usd, 6) AS gross_margin_usd,
    CASE
      WHEN a.total_revenue_usd > 0 THEN ROUND(((a.total_revenue_usd - a.total_cost_usd) / a.total_revenue_usd) * 100, 4)
      ELSE 0
    END AS margin_percent,
    NOW()
  FROM assembled a
  ON CONFLICT (day) DO UPDATE SET
    total_cost_usd = EXCLUDED.total_cost_usd,
    total_revenue_usd = EXCLUDED.total_revenue_usd,
    total_credits_sold = EXCLUDED.total_credits_sold,
    total_refunded_credits = EXCLUDED.total_refunded_credits,
    total_jobs = EXCLUDED.total_jobs,
    completed_jobs = EXCLUDED.completed_jobs,
    failed_jobs = EXCLUDED.failed_jobs,
    paid_orders = EXCLUDED.paid_orders,
    cost_per_credit_usd = EXCLUDED.cost_per_credit_usd,
    revenue_per_credit_usd = EXCLUDED.revenue_per_credit_usd,
    gross_margin_usd = EXCLUDED.gross_margin_usd,
    margin_percent = EXCLUDED.margin_percent,
    refreshed_at = NOW();

  RETURN v_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
