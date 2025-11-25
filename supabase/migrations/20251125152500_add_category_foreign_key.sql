-- =====================================================
-- Add Foreign Key Constraint for Category Code
-- =====================================================
-- PostgREST requires actual FK constraints for JOIN syntax to work.
-- This adds the missing FK between classified_bank_transactions
-- and display_categories on category_code.
-- =====================================================

ALTER TABLE public.classified_bank_transactions
ADD CONSTRAINT fk_category_code
FOREIGN KEY (category_code)
REFERENCES public.display_categories(category_code);

-- Add comment
COMMENT ON CONSTRAINT fk_category_code ON public.classified_bank_transactions IS
  'Foreign key to display_categories.category_code. Required by PostgREST for JOIN operations in API queries.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- After this migration:
-- 1. PostgREST JOIN syntax will work in API queries
-- 2. Cannot insert category_code that doesn't exist in display_categories
-- 3. Referential integrity enforced at database level
-- =====================================================
