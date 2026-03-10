-- Atomic and idempotent payment capture for Razorpay orders

CREATE OR REPLACE FUNCTION public.capture_payment_order(
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'verify'
)
RETURNS TABLE (
  success BOOLEAN,
  already_processed BOOLEAN,
  credits_added INTEGER,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.payment_orders%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM public.payment_orders
  WHERE razorpay_order_id = p_razorpay_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, 0, NULL::UUID;
    RETURN;
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN QUERY SELECT TRUE, TRUE, 0, v_order.user_id;
    RETURN;
  END IF;

  UPDATE public.payment_orders
  SET status = 'paid',
      razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
      razorpay_signature = COALESCE(p_razorpay_signature, razorpay_signature),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'capturedBy', p_source,
        'capturedAt', NOW()
      )
  WHERE id = v_order.id;

  UPDATE public.users
  SET credits = credits + v_order.credits
  WHERE id = v_order.user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    project_id,
    amount,
    transaction_type,
    description,
    payment_order_id
  )
  VALUES (
    v_order.user_id,
    NULL,
    v_order.credits,
    'purchase',
    format('Razorpay %s %s', p_source, COALESCE(p_razorpay_payment_id, p_razorpay_order_id)),
    v_order.id
  );

  RETURN QUERY SELECT TRUE, FALSE, v_order.credits, v_order.user_id;
END;
$$;
