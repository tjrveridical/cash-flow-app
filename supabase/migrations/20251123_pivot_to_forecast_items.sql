-- =====================================================
-- CRITICAL PIVOT: Payment Rules Architecture Refactor
-- =====================================================
-- This migration transforms payment rules from transaction-linked
-- to forward-looking forecast generation system.
--
-- Key changes:
-- 1. Payment rules become reusable rule library (no vendor_id)
-- 2. Forecast items link vendors to rules (forward-looking)
-- 3. Raw transactions get validation workflow (backward-looking)
-- 4. Forecast transactions = generated future payments

-- =====================================================
-- STEP 1: Modify payment_rules table
-- =====================================================

-- Add rule_name column (unique identifier like "Monthly_15")
ALTER TABLE public.payment_rules
ADD COLUMN IF NOT EXISTS rule_name TEXT UNIQUE;

-- Make vendor_id nullable (for backward compatibility during migration)
-- In practice, new payment rules won't use vendor_id at all
ALTER TABLE public.payment_rules
ALTER COLUMN vendor_id DROP NOT NULL;

-- Drop the unique constraint on vendor_id (rules are now reusable)
ALTER TABLE public.payment_rules
DROP CONSTRAINT IF EXISTS unique_vendor_rule;

-- =====================================================
-- STEP 2: Create forecast_items table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.forecast_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  estimated_amount NUMERIC NOT NULL,
  rule_id UUID NOT NULL REFERENCES public.payment_rules(id) ON DELETE CASCADE,
  category_code TEXT REFERENCES public.display_categories(category_code),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_forecast_items_rule_id ON public.forecast_items(rule_id);
CREATE INDEX idx_forecast_items_vendor_name ON public.forecast_items(vendor_name);
CREATE INDEX idx_forecast_items_active ON public.forecast_items(is_active);

-- Updated_at trigger
CREATE TRIGGER update_forecast_items_updated_at BEFORE UPDATE ON public.forecast_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.forecast_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read forecast items"
  ON public.forecast_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow CFO/CEO to insert forecast items"
  ON public.forecast_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to update forecast items"
  ON public.forecast_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to delete forecast items"
  ON public.forecast_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

-- =====================================================
-- STEP 3: Add validation columns to raw_transactions
-- =====================================================

-- Add validated flag (false until user validates in ACTUALS tab)
ALTER TABLE public.raw_transactions
ADD COLUMN IF NOT EXISTS validated BOOLEAN NOT NULL DEFAULT false;

-- Add link to forecast_item (null until validated, or null for one-time transactions)
ALTER TABLE public.raw_transactions
ADD COLUMN IF NOT EXISTS forecast_item_id UUID REFERENCES public.forecast_items(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_raw_transactions_validated ON public.raw_transactions(validated);
CREATE INDEX idx_raw_transactions_forecast_item_id ON public.raw_transactions(forecast_item_id);

-- =====================================================
-- STEP 4: Create forecast_transactions table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.forecast_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_item_id UUID NOT NULL REFERENCES public.forecast_items(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_forecast_transactions_forecast_item_id ON public.forecast_transactions(forecast_item_id);
CREATE INDEX idx_forecast_transactions_payment_date ON public.forecast_transactions(payment_date);

-- RLS
ALTER TABLE public.forecast_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read forecast transactions"
  ON public.forecast_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow CFO/CEO to insert forecast transactions"
  ON public.forecast_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to delete forecast transactions"
  ON public.forecast_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

-- =====================================================
-- STEP 5: Seed sample payment rules
-- =====================================================

-- Weekly rules (anchor_days = day of week, 0=Sunday, 6=Saturday)
INSERT INTO public.payment_rules (rule_name, frequency, anchor_days, exception_rule, estimated_amount)
VALUES
  ('Weekly_Monday', 'weekly', '[1]'::jsonb, 'move_later', 0),
  ('Weekly_Friday', 'weekly', '[5]'::jsonb, 'move_later', 0)
ON CONFLICT (rule_name) DO NOTHING;

-- Semi-monthly rules (anchor_days = two dates in month)
INSERT INTO public.payment_rules (rule_name, frequency, anchor_days, exception_rule, estimated_amount)
VALUES
  ('SemiMonthly_1_15', 'semi-monthly', '[1,15]'::jsonb, 'move_later', 0),
  ('SemiMonthly_5_20', 'semi-monthly', '[5,20]'::jsonb, 'move_later', 0)
ON CONFLICT (rule_name) DO NOTHING;

-- Monthly rules (anchor_days = day of month)
INSERT INTO public.payment_rules (rule_name, frequency, anchor_days, exception_rule, estimated_amount)
VALUES
  ('Monthly_1', 'monthly', '[1]'::jsonb, 'move_later', 0),
  ('Monthly_5', 'monthly', '[5]'::jsonb, 'move_later', 0),
  ('Monthly_10', 'monthly', '[10]'::jsonb, 'move_later', 0),
  ('Monthly_15', 'monthly', '[15]'::jsonb, 'move_later', 0),
  ('Monthly_20', 'monthly', '[20]'::jsonb, 'move_later', 0),
  ('Monthly_25', 'monthly', '[25]'::jsonb, 'move_later', 0),
  ('Monthly_LastDay', 'monthly', '[31]'::jsonb, 'move_earlier', 0) -- 31 = last day of month
ON CONFLICT (rule_name) DO NOTHING;

-- Quarterly rules (anchor_days = [day, starting_month] where month: 1=Jan, 2=Feb, etc.)
INSERT INTO public.payment_rules (rule_name, frequency, anchor_days, exception_rule, estimated_amount)
VALUES
  ('Quarterly_1_Jan', 'quarterly', '[1,1]'::jsonb, 'move_later', 0),  -- Jan 1, Apr 1, Jul 1, Oct 1
  ('Quarterly_15_Feb', 'quarterly', '[15,2]'::jsonb, 'move_later', 0), -- Feb 15, May 15, Aug 15, Nov 15
  ('Quarterly_1_Mar', 'quarterly', '[1,3]'::jsonb, 'move_later', 0)   -- Mar 1, Jun 1, Sep 1, Dec 1
ON CONFLICT (rule_name) DO NOTHING;

-- Semi-annual rules (anchor_days = [month1, day1, month2, day2])
INSERT INTO public.payment_rules (rule_name, frequency, anchor_days, exception_rule, estimated_amount)
VALUES
  ('SemiAnnual_Jan1_Jul1', 'semi-annual', '[1,1,7,1]'::jsonb, 'move_later', 0),
  ('SemiAnnual_Jan15_Jul15', 'semi-annual', '[1,15,7,15]'::jsonb, 'move_later', 0),
  ('SemiAnnual_Feb1_Aug1', 'semi-annual', '[2,1,8,1]'::jsonb, 'move_later', 0)
ON CONFLICT (rule_name) DO NOTHING;

-- Annual rules (anchor_days = [month, day])
INSERT INTO public.payment_rules (rule_name, frequency, anchor_days, exception_rule, estimated_amount)
VALUES
  ('Annual_Jan1', 'annual', '[1,1]'::jsonb, 'move_later', 0),
  ('Annual_Dec1', 'annual', '[12,1]'::jsonb, 'move_later', 0),
  ('Annual_Dec31', 'annual', '[12,31]'::jsonb, 'move_earlier', 0)
ON CONFLICT (rule_name) DO NOTHING;

-- =====================================================
-- STEP 6: Add helper function for unvalidated count
-- =====================================================

CREATE OR REPLACE FUNCTION get_unvalidated_transaction_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM public.raw_transactions WHERE validated = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
