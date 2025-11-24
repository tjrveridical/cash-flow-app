-- =====================================================
-- Schema Fix: Remove Redundancy & Add Variance Tracking
-- =====================================================
-- This migration fixes the schema to follow single source of truth:
-- - Payment rules = PURE date calculation (no amounts)
-- - Forecast items = vendor + amount + rule
-- - Forecast transactions = generated payments with variance tracking

-- =====================================================
-- STEP 1: Remove estimated_amount from payment_rules
-- =====================================================

-- Drop the column (it should only exist in forecast_items)
ALTER TABLE public.payment_rules
DROP COLUMN IF EXISTS estimated_amount CASCADE;

-- =====================================================
-- STEP 2: Add variance tracking to forecast_transactions
-- =====================================================

-- Add forecast_amount column (the amount we're forecasting)
ALTER TABLE public.forecast_transactions
ADD COLUMN IF NOT EXISTS forecast_amount NUMERIC NOT NULL DEFAULT 0;

-- Add actual_amount column (the amount from matched raw_transaction)
ALTER TABLE public.forecast_transactions
ADD COLUMN IF NOT EXISTS actual_amount NUMERIC NULL;

-- Add FK to raw_transactions (links to the matched transaction)
ALTER TABLE public.forecast_transactions
ADD COLUMN IF NOT EXISTS actual_transaction_id UUID NULL
  REFERENCES public.raw_transactions(id) ON DELETE SET NULL;

-- Add variance column (calculated: actual_amount - forecast_amount)
ALTER TABLE public.forecast_transactions
ADD COLUMN IF NOT EXISTS variance NUMERIC NULL;

-- Add status column (pending, matched, missed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'forecast_transaction_status') THEN
    CREATE TYPE forecast_transaction_status AS ENUM ('pending', 'matched', 'missed');
  END IF;
END $$;

ALTER TABLE public.forecast_transactions
ADD COLUMN IF NOT EXISTS status forecast_transaction_status NOT NULL DEFAULT 'pending';

-- Remove the default from forecast_amount after adding it
ALTER TABLE public.forecast_transactions
ALTER COLUMN forecast_amount DROP DEFAULT;

-- =====================================================
-- STEP 3: Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_forecast_transactions_status
  ON public.forecast_transactions(status);

CREATE INDEX IF NOT EXISTS idx_forecast_transactions_payment_date_range
  ON public.forecast_transactions(payment_date);

CREATE INDEX IF NOT EXISTS idx_forecast_transactions_actual_transaction_id
  ON public.forecast_transactions(actual_transaction_id);

-- =====================================================
-- STEP 4: Add trigger to calculate variance automatically
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_variance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate variance when actual_amount is set
  IF NEW.actual_amount IS NOT NULL THEN
    NEW.variance := NEW.actual_amount - NEW.forecast_amount;

    -- Auto-update status to 'matched' when actual_amount is set
    IF NEW.status = 'pending' THEN
      NEW.status := 'matched';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_variance
  BEFORE INSERT OR UPDATE ON public.forecast_transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_variance();

-- =====================================================
-- STEP 5: Add helper function to find matching forecast transaction
-- =====================================================

CREATE OR REPLACE FUNCTION find_matching_forecast_transaction(
  p_forecast_item_id UUID,
  p_transaction_date DATE,
  p_date_tolerance_days INTEGER DEFAULT 3
)
RETURNS UUID AS $$
DECLARE
  v_forecast_transaction_id UUID;
BEGIN
  -- Find forecast_transaction within date range that's not already matched
  SELECT id INTO v_forecast_transaction_id
  FROM public.forecast_transactions
  WHERE forecast_item_id = p_forecast_item_id
    AND payment_date BETWEEN (p_transaction_date - p_date_tolerance_days)
                         AND (p_transaction_date + p_date_tolerance_days)
    AND status = 'pending'
  ORDER BY ABS(EXTRACT(EPOCH FROM (payment_date - p_transaction_date)))
  LIMIT 1;

  RETURN v_forecast_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: Update RLS policies for new columns
-- =====================================================

-- No new policies needed - existing policies on forecast_transactions table cover new columns

-- =====================================================
-- STEP 7: Add comment documentation
-- =====================================================

COMMENT ON COLUMN public.forecast_transactions.forecast_amount IS
  'The forecasted/estimated amount from the forecast_item (what we expect to pay)';

COMMENT ON COLUMN public.forecast_transactions.actual_amount IS
  'The actual amount from the matched raw_transaction (what we actually paid)';

COMMENT ON COLUMN public.forecast_transactions.actual_transaction_id IS
  'Foreign key to raw_transactions.id - links to the actual transaction that matched this forecast';

COMMENT ON COLUMN public.forecast_transactions.variance IS
  'Calculated variance: actual_amount - forecast_amount. Positive = paid more than forecast, Negative = paid less';

COMMENT ON COLUMN public.forecast_transactions.status IS
  'Status of this forecast transaction: pending (not paid yet), matched (paid and matched to actual), missed (date passed but no match found)';
