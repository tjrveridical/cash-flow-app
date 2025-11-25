-- =====================================================
-- Fix Transaction and Category Schema
-- =====================================================
-- This migration fixes schema mismatches that prevent the forecast
-- pipeline from working. It adds missing columns to raw_transactions
-- and display_categories, then seeds base category data.
--
-- Background: The import service, classification engine, and forecast
-- service all expect columns that were not created in initial migrations.
-- This migration adds all missing columns in one atomic operation.
-- =====================================================

-- =====================================================
-- PART 1: Fix raw_transactions Schema
-- =====================================================
-- Add QuickBooks transaction fields that are parsed from CSV
-- but were missing from the database schema.

ALTER TABLE public.raw_transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT,
ADD COLUMN IF NOT EXISTS qb_account_number TEXT,
ADD COLUMN IF NOT EXISTS qb_account_name TEXT;

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_raw_transactions_transaction_type
  ON public.raw_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_raw_transactions_qb_account_number
  ON public.raw_transactions(qb_account_number);

CREATE INDEX IF NOT EXISTS idx_raw_transactions_qb_account_name
  ON public.raw_transactions(qb_account_name);

-- Add comments for documentation
COMMENT ON COLUMN public.raw_transactions.transaction_type IS
  'QuickBooks transaction type from CSV Column C (e.g., Bill Payment (Check), Deposit, Journal Entry, Transfer). Used for exclusion rules and classification logic.';

COMMENT ON COLUMN public.raw_transactions.qb_account_number IS
  'QuickBooks GL account number parsed from CSV Column G Account Full Name (e.g., 1000, 1015, 2010, 5100). Used for bank account validation and GL-based classification rules.';

COMMENT ON COLUMN public.raw_transactions.qb_account_name IS
  'QuickBooks GL account name from CSV Column G Account Full Name (e.g., Bank of America, 2010 Accounts Payable, 1200 Accounts Receivable). Used for AR split logic and display labels.';

-- =====================================================
-- PART 2: Fix display_categories Schema
-- =====================================================
-- Add columns needed for forecast grouping, display hierarchy,
-- and cash flow direction tracking.

ALTER TABLE public.display_categories
ADD COLUMN IF NOT EXISTS display_group TEXT NOT NULL DEFAULT 'Other',
ADD COLUMN IF NOT EXISTS category_code TEXT,
ADD COLUMN IF NOT EXISTS display_label2 TEXT,
ADD COLUMN IF NOT EXISTS sort_order NUMERIC,
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'forecast',
ADD COLUMN IF NOT EXISTS cash_direction TEXT;

-- Add unique constraint on category_code (used as join key)
ALTER TABLE public.display_categories
ADD CONSTRAINT unique_category_code UNIQUE (category_code);

-- Add check constraint on cash_direction
ALTER TABLE public.display_categories
ADD CONSTRAINT check_cash_direction
CHECK (cash_direction IN ('Cashin', 'Cashout') OR cash_direction IS NULL);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_display_categories_category_code
  ON public.display_categories(category_code);

CREATE INDEX IF NOT EXISTS idx_display_categories_display_group
  ON public.display_categories(display_group);

CREATE INDEX IF NOT EXISTS idx_display_categories_sort_order
  ON public.display_categories(sort_order);

-- Add comments for documentation
COMMENT ON COLUMN public.display_categories.display_group IS
  'Section grouping for forecast grid (e.g., AR, Labor, COGS, Facilities, NL Opex, Other). Used to organize categories into collapsible sections.';

COMMENT ON COLUMN public.display_categories.category_code IS
  'Unique identifier used as join key between classified_bank_transactions and display_categories (e.g., labor_payroll, facilities_rent). This is the single source of truth for category mapping.';

COMMENT ON COLUMN public.display_categories.display_label2 IS
  'Third level of hierarchy for 3-level category structure (e.g., "Nurse Call" under COGS > Hardware). Used for detailed expense card drilldowns.';

COMMENT ON COLUMN public.display_categories.sort_order IS
  'Numeric ordering for display (1000, 1001, 2000, etc.). Lower numbers appear first. Grouped by thousands (AR=1000s, Labor=2000s, COGS=3000s, etc.).';

COMMENT ON COLUMN public.display_categories.scope IS
  'Determines where category appears: "forecast" for main forecast grid, "expense_card" for detailed expense tracking. Allows different granularity in different views.';

COMMENT ON COLUMN public.display_categories.cash_direction IS
  'Cash flow direction: "Cashin" for revenue/inflows, "Cashout" for expenses/outflows. Used to split transactions into inflows vs outflows in forecast aggregation.';

-- =====================================================
-- PART 3: Seed Base Categories
-- =====================================================
-- Populate display_categories with foundational categories
-- needed for classification rules to function properly.
-- Sort order: AR (1000s), Labor (2000s), COGS (3000s),
-- Facilities (4000s), NL Opex (5000s), Other (9000s)

INSERT INTO public.display_categories
  (display_group, display_label, category_code, sort_order, cash_direction, scope)
VALUES
  -- =====================================================
  -- AR - Accounts Receivable / Revenue (Cash Inflows)
  -- =====================================================
  ('AR', 'AR Collections', 'ar_collections', 1000, 'Cashin', 'forecast'),
  ('AR', 'Other Revenue', 'ar_other_revenue', 1001, 'Cashin', 'forecast'),

  -- =====================================================
  -- Labor - Employee Costs (Cash Outflows)
  -- =====================================================
  ('Labor', 'Payroll', 'labor_payroll', 2000, 'Cashout', 'forecast'),
  ('Labor', 'Benefits', 'labor_benefits', 2001, 'Cashout', 'forecast'),
  ('Labor', 'Payroll Taxes', 'labor_payroll_taxes', 2002, 'Cashout', 'forecast'),

  -- =====================================================
  -- COGS - Cost of Goods Sold (Cash Outflows)
  -- =====================================================
  ('COGS', 'Hardware', 'cogs_hardware', 3000, 'Cashout', 'forecast'),
  ('COGS', 'Software', 'cogs_software', 3001, 'Cashout', 'forecast'),
  ('COGS', 'Labor', 'cogs_labor', 3002, 'Cashout', 'forecast'),

  -- =====================================================
  -- Facilities - Building & Property (Cash Outflows)
  -- =====================================================
  ('Facilities', 'Rent', 'facilities_rent', 4000, 'Cashout', 'forecast'),
  ('Facilities', 'Utilities', 'facilities_utilities', 4001, 'Cashout', 'forecast'),
  ('Facilities', 'Maintenance', 'facilities_maintenance', 4002, 'Cashout', 'forecast'),

  -- =====================================================
  -- NL Opex - Non-Labor Operating Expenses (Cash Outflows)
  -- =====================================================
  ('NL Opex', 'Software Subscriptions', 'opex_software', 5000, 'Cashout', 'forecast'),
  ('NL Opex', 'Insurance', 'opex_insurance', 5001, 'Cashout', 'forecast'),
  ('NL Opex', 'Professional Services', 'opex_professional_services', 5002, 'Cashout', 'forecast'),
  ('NL Opex', 'Office Supplies', 'opex_office_supplies', 5003, 'Cashout', 'forecast'),
  ('NL Opex', 'Taxes', 'opex_taxes', 5004, 'Cashout', 'forecast'),

  -- =====================================================
  -- Other - Unclassified / Catch-all (Cash Outflows)
  -- =====================================================
  ('Other', 'Unclassified', 'other_other', 9000, 'Cashout', 'forecast')
ON CONFLICT (category_code) DO NOTHING;

-- =====================================================
-- PART 4: Add Comment on Table
-- =====================================================

COMMENT ON TABLE public.display_categories IS
  'Category hierarchy for forecast display and classification. Links to classified_bank_transactions via category_code. Supports 3-level hierarchy (group > label > label2) with configurable scope for different views.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- After this migration:
-- 1. CSV import will populate all transaction fields
-- 2. Classification engine can read qb_account_number/name
-- 3. Forecast service can join transactions to display categories
-- 4. Forecast grid will display properly grouped categories
--
-- Next steps:
-- 1. Upload CSV at /import
-- 2. Run classification: POST /api/classification/run
-- 3. Add beginning cash balance to cash_balances table
-- 4. View forecast at /forecast
-- =====================================================
