-- ============================================
-- FIX ORDER TRACKING PAGE
-- Run this entire script in Supabase SQL Editor
-- ============================================
-- Problem: The live get_order_details() expects a UUID parameter named
-- p_order_id, but the tracking page sends a TBS-XXXX order_number under
-- the name order_id_input. Every request fails with 400 / 22P02.
--
-- Fix: (1) ensure orders.order_number exists, (2) drop ALL old overloads,
-- (3) recreate the function so it accepts TEXT, matches by order_number
-- OR by uuid prefix, and uses the parameter name the frontend sends.
-- ============================================

-- 1. Make sure the order_number column exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- 2. Drop every existing overload so there is no ambiguity
DROP FUNCTION IF EXISTS get_order_details(text);
DROP FUNCTION IF EXISTS get_order_details(uuid);
DROP FUNCTION IF EXISTS public.get_order_details(p_order_id uuid);
DROP FUNCTION IF EXISTS public.get_order_details(p_order_id text);

-- 3. Recreate with the parameter name and search behavior the app expects
CREATE OR REPLACE FUNCTION get_order_details(order_id_input TEXT)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  order_status TEXT,
  payment_status TEXT,
  tracking_number TEXT,
  shipping_provider TEXT,
  shipping_note TEXT,
  total_price DECIMAL(10,2),
  shipping_fee DECIMAL(10,2),
  order_items JSONB,
  created_at TIMESTAMPTZ,
  promo_code TEXT,
  discount_applied DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.order_status,
    o.payment_status,
    o.tracking_number,
    o.shipping_provider,
    o.shipping_note,
    o.total_price,
    o.shipping_fee,
    o.order_items,
    o.created_at,
    o.promo_code,
    o.discount_applied
  FROM orders o
  WHERE
    o.order_number ILIKE order_id_input
    OR o.id::text ILIKE order_id_input || '%'
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_order_details(TEXT) TO public, anon, authenticated;

-- 4. Force PostgREST to refresh its schema cache so the new signature
--    is picked up immediately (otherwise you may still see PGRST202).
NOTIFY pgrst, 'reload schema';
