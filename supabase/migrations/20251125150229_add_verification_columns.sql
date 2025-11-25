-- =====================================================
-- Add Verification Columns to classified_bank_transactions
-- =====================================================
-- This migration adds verification workflow support to enable
-- manual review and approval of automated classifications.
--
-- Use case: CFO/Accountant reviews auto-classified transactions
-- in Verification Inbox and marks them as verified after review.
-- =====================================================

-- Add verification columns
ALTER TABLE public.classified_bank_transactions
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Add partial index for fast lookup of unverified transactions
-- Only indexes rows where is_verified = false (reduces index size)
CREATE INDEX IF NOT EXISTS idx_classified_bank_transactions_unverified
  ON public.classified_bank_transactions (is_verified)
  WHERE is_verified = false;

-- Add index on verified_at for filtering by verification date
CREATE INDEX IF NOT EXISTS idx_classified_bank_transactions_verified_at
  ON public.classified_bank_transactions (verified_at)
  WHERE verified_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.classified_bank_transactions.is_verified IS
  'Indicates whether a human has reviewed and approved this classification. Default false for automated classifications. Set to true in Verification Inbox after review.';

COMMENT ON COLUMN public.classified_bank_transactions.verified_at IS
  'Timestamp when classification was verified by a human reviewer. NULL if not yet verified.';

COMMENT ON COLUMN public.classified_bank_transactions.verified_by IS
  'User ID or email of the person who verified this classification. NULL if not yet verified or verified by system.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- After this migration:
-- 1. All existing classifications have is_verified = false
-- 2. Verification Inbox can query WHERE is_verified = false
-- 3. When user verifies, UPDATE SET is_verified = true, verified_at = now(), verified_by = user_id
-- 4. Forecast can optionally filter to show only verified transactions
-- =====================================================
