-- Reconciliation primitives for paid orders vs credit grants

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS payment_order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_transactions_payment_order_id
  ON public.credit_transactions(payment_order_id)
  WHERE payment_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_order_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor TEXT NOT NULL DEFAULT 'system',
  repair_mode BOOLEAN NOT NULL DEFAULT FALSE,
  scanned_count INTEGER NOT NULL DEFAULT 0,
  repaired_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payment_order_reconciliation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reconciliation runs" ON public.payment_order_reconciliation_runs
  FOR SELECT USING (FALSE);

CREATE OR REPLACE FUNCTION public.reconcile_paid_payment_orders(
  p_limit INTEGER DEFAULT 100,
  p_repair BOOLEAN DEFAULT FALSE,
  p_actor TEXT DEFAULT 'system'
)
RETURNS TABLE (
  payment_order_id UUID,
  user_id UUID,
  credits INTEGER,
  issue TEXT,
  repaired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  v_repaired BOOLEAN;
  v_scanned INTEGER := 0;
  v_repaired_count INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT po.id, po.user_id, po.credits, po.razorpay_payment_id, po.razorpay_order_id
    FROM public.payment_orders po
    WHERE po.status = 'paid'
      AND NOT EXISTS (
        SELECT 1
        FROM public.credit_transactions ct
        WHERE ct.payment_order_id = po.id
      )
    ORDER BY po.created_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 1000))
  LOOP
    v_scanned := v_scanned + 1;
    v_repaired := FALSE;

    IF p_repair THEN
      PERFORM 1
      FROM public.payment_orders
      WHERE id = rec.id
      FOR UPDATE;

      IF NOT EXISTS (
        SELECT 1
        FROM public.credit_transactions ct
        WHERE ct.payment_order_id = rec.id
      ) THEN
        UPDATE public.users
        SET credits = credits + rec.credits
        WHERE id = rec.user_id;

        INSERT INTO public.credit_transactions (
          user_id,
          project_id,
          amount,
          transaction_type,
          description,
          payment_order_id
        )
        VALUES (
          rec.user_id,
          NULL,
          rec.credits,
          'purchase',
          format('Razorpay reconciliation %s', COALESCE(rec.razorpay_payment_id, rec.razorpay_order_id)),
          rec.id
        )
        ON CONFLICT DO NOTHING;

        IF EXISTS (
          SELECT 1
          FROM public.credit_transactions ct
          WHERE ct.payment_order_id = rec.id
        ) THEN
          v_repaired := TRUE;
          v_repaired_count := v_repaired_count + 1;
        END IF;
      END IF;
    END IF;

    RETURN QUERY
    SELECT
      rec.id::UUID,
      rec.user_id::UUID,
      rec.credits::INTEGER,
      'missing_credit_transaction'::TEXT,
      v_repaired;
  END LOOP;

  INSERT INTO public.payment_order_reconciliation_runs (
    actor,
    repair_mode,
    scanned_count,
    repaired_count
  )
  VALUES (
    COALESCE(p_actor, 'system'),
    COALESCE(p_repair, FALSE),
    v_scanned,
    v_repaired_count
  );
END;
$$;
