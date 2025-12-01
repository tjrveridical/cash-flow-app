-- ================================================================
-- AR Category Consolidation Migration
-- ================================================================
-- Consolidates all AR subcategories into ar_collections
-- Removes: ar_other, ar_other_revenue, ar_project, ar_services
--
-- BEFORE:
--   classified_bank_transactions:
--     ar_collections: 1
--     ar_other: 1
--     ar_project: 54
--     ar_services: 7
--   Total affected: 62 transactions
-- ================================================================

BEGIN;

-- Show current state
DO $$
DECLARE
  ar_collections_count INT;
  ar_other_count INT;
  ar_project_count INT;
  ar_services_count INT;
BEGIN
  SELECT COUNT(*) INTO ar_collections_count FROM classified_bank_transactions WHERE category_code = 'ar_collections';
  SELECT COUNT(*) INTO ar_other_count FROM classified_bank_transactions WHERE category_code = 'ar_other';
  SELECT COUNT(*) INTO ar_project_count FROM classified_bank_transactions WHERE category_code = 'ar_project';
  SELECT COUNT(*) INTO ar_services_count FROM classified_bank_transactions WHERE category_code = 'ar_services';

  RAISE NOTICE '=== BEFORE MIGRATION ===';
  RAISE NOTICE 'ar_collections: %', ar_collections_count;
  RAISE NOTICE 'ar_other: %', ar_other_count;
  RAISE NOTICE 'ar_project: %', ar_project_count;
  RAISE NOTICE 'ar_services: %', ar_services_count;
END $$;

-- Update classified_bank_transactions
-- Consolidate all AR subcategories to ar_collections
UPDATE classified_bank_transactions
SET
  category_code = 'ar_collections',
  classification = 'ar_collections',
  notes = CASE
    WHEN notes IS NULL THEN 'Migrated from ' || category_code || ' to ar_collections'
    ELSE notes || ' | Migrated from ' || category_code || ' to ar_collections'
  END
WHERE category_code IN ('ar_other', 'ar_other_revenue', 'ar_project', 'ar_services');

-- Delete unused AR subcategories from display_categories
DELETE FROM display_categories
WHERE category_code IN ('ar_other', 'ar_other_revenue', 'ar_project', 'ar_services');

-- Show final state
DO $$
DECLARE
  ar_collections_count INT;
  ar_other_count INT;
  ar_project_count INT;
  ar_services_count INT;
  total_ar_count INT;
BEGIN
  SELECT COUNT(*) INTO ar_collections_count FROM classified_bank_transactions WHERE category_code = 'ar_collections';
  SELECT COUNT(*) INTO ar_other_count FROM classified_bank_transactions WHERE category_code = 'ar_other';
  SELECT COUNT(*) INTO ar_project_count FROM classified_bank_transactions WHERE category_code = 'ar_project';
  SELECT COUNT(*) INTO ar_services_count FROM classified_bank_transactions WHERE category_code = 'ar_services';
  SELECT COUNT(*) INTO total_ar_count FROM classified_bank_transactions
    JOIN display_categories ON classified_bank_transactions.category_code = display_categories.category_code
    WHERE display_categories.display_group = 'AR';

  RAISE NOTICE '=== AFTER MIGRATION ===';
  RAISE NOTICE 'ar_collections: %', ar_collections_count;
  RAISE NOTICE 'ar_other: %', ar_other_count;
  RAISE NOTICE 'ar_project: %', ar_project_count;
  RAISE NOTICE 'ar_services: %', ar_services_count;
  RAISE NOTICE 'Total AR transactions: %', total_ar_count;
  RAISE NOTICE 'Deleted 4 AR subcategories from display_categories';
END $$;

COMMIT;
