-- ====================================================================
-- ADD CATEGORY_CODE TO CLASSIFIED_BANK_TRANSACTIONS
-- ====================================================================
-- This migration adds category_code column to enable direct joins
-- to display_categories for forecast aggregation and display.
-- The old classification column is kept for debugging purposes.
-- ====================================================================

-- Add category_code column
ALTER TABLE public.classified_bank_transactions
ADD COLUMN IF NOT EXISTS category_code TEXT;

-- Create index for faster joins
CREATE INDEX IF NOT EXISTS idx_classified_bank_transactions_category_code
ON public.classified_bank_transactions(category_code);

-- Add comment
COMMENT ON COLUMN public.classified_bank_transactions.category_code IS
'Matches display_categories.category_code for forecast grouping. Replaces free-text classification column.';

-- ====================================================================
-- CREATE CASH_BALANCES TABLE
-- ====================================================================
-- Manual entry of starting cash positions by bank account.
-- V1: Single manual entry by CFO
-- V2: Automated reconciliation and historical tracking
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.cash_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  balance NUMERIC NOT NULL,
  notes TEXT,
  entered_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(bank_account, as_of_date)
);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_cash_balances_lookup
ON public.cash_balances(bank_account, as_of_date DESC);

-- Add comment
COMMENT ON TABLE public.cash_balances IS
'Manual CFO entry of starting cash positions. Used as "Beginning Cash" in forecast grid.';
