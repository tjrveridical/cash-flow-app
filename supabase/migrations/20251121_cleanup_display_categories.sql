-- ====================================================================
-- DISPLAY CATEGORIES HIERARCHY CLEANUP SCRIPT
-- ====================================================================
-- This script:
-- 1. Identifies duplicate display_group parent rows
-- 2. Keeps the correct parent (parent_id IS NULL)
-- 3. Reparents all children to the correct parent
-- 4. Deletes duplicate parent rows
-- 5. Rebuilds sort_order for 3-level hierarchy
-- ====================================================================

BEGIN;

-- Step 1: Identify the correct parent for each display_group
-- (the one with parent_id IS NULL)
CREATE TEMP TABLE correct_parents AS
SELECT DISTINCT ON (display_group)
  id AS correct_parent_id,
  display_group
FROM display_categories
WHERE parent_id IS NULL
ORDER BY display_group, created_at ASC;

-- Step 2: Identify duplicate parent rows (incorrect ones)
CREATE TEMP TABLE duplicate_parents AS
SELECT dc.id AS duplicate_id, dc.display_group
FROM display_categories dc
WHERE dc.display_label = dc.display_group
  AND dc.id NOT IN (SELECT correct_parent_id FROM correct_parents);

-- Step 3: Reparent any children of duplicate parents to correct parents
UPDATE display_categories
SET parent_id = cp.correct_parent_id,
    updated_at = now()
FROM duplicate_parents dp
JOIN correct_parents cp ON dp.display_group = cp.display_group
WHERE display_categories.parent_id = dp.duplicate_id;

-- Step 4: Delete duplicate parent rows
DELETE FROM display_categories
WHERE id IN (SELECT duplicate_id FROM duplicate_parents);

-- Step 5: Ensure all leaf rows (display_label != display_group) have correct parent
UPDATE display_categories dc
SET parent_id = cp.correct_parent_id,
    updated_at = now()
FROM correct_parents cp
WHERE dc.display_group = cp.display_group
  AND dc.display_label != dc.display_group
  AND (dc.parent_id IS NULL OR dc.parent_id != cp.correct_parent_id);

-- Step 6: Create parent rows if they don't exist for any display_group
INSERT INTO display_categories (
  display_label,
  display_group,
  parent_id,
  sort_order,
  scope,
  cash_direction,
  is_active,
  category_code
)
SELECT DISTINCT
  display_group AS display_label,
  display_group,
  NULL::uuid AS parent_id,
  NULL::numeric AS sort_order,
  MIN(scope) AS scope,
  MIN(cash_direction) AS cash_direction,
  true AS is_active,
  'group_' || LOWER(REPLACE(REPLACE(display_group, ' ', '_'), '&', 'and')) AS category_code
FROM display_categories
WHERE display_group NOT IN (SELECT display_group FROM correct_parents)
GROUP BY display_group
ON CONFLICT (category_code) DO NOTHING;

-- Step 7: Rebuild sort_order using CTEs (CFO-friendly ordering)

-- 7a: Define Level 1 ordering (display_groups)
WITH level1_order AS (
  SELECT display_group, ROW_NUMBER() OVER (ORDER BY
    CASE display_group
      WHEN 'AR' THEN 1
      WHEN 'Labor' THEN 2
      WHEN 'COGS' THEN 3
      WHEN 'Facilities' THEN 4
      WHEN 'NL Opex' THEN 5
      WHEN 'Other' THEN 6
      WHEN 'Auto Repair' THEN 7
      WHEN 'Gas' THEN 8
      WHEN 'Meals and Ent' THEN 9
      WHEN 'Mileage' THEN 10
      WHEN 'Travel' THEN 11
      ELSE 99
    END,
    display_group
  ) * 1000 AS sort_order
  FROM (SELECT DISTINCT display_group FROM display_categories) groups
)
UPDATE display_categories dc
SET sort_order = lo.sort_order,
    updated_at = now()
FROM level1_order lo
WHERE dc.display_group = lo.display_group
  AND dc.parent_id IS NULL
  AND dc.display_label = dc.display_group;

-- 7b: Level 2 ordering (children within each group)
WITH parent_sort AS (
  SELECT id, display_group, sort_order
  FROM display_categories
  WHERE parent_id IS NULL AND display_label = display_group
),
level2_numbered AS (
  SELECT
    dc.id,
    ps.sort_order AS parent_sort,
    ROW_NUMBER() OVER (
      PARTITION BY dc.display_group
      ORDER BY dc.display_label
    ) AS row_num
  FROM display_categories dc
  JOIN parent_sort ps ON dc.display_group = ps.display_group
  WHERE dc.parent_id IS NOT NULL
    AND dc.display_label2 IS NULL
)
UPDATE display_categories dc
SET sort_order = ln.parent_sort + ln.row_num,
    updated_at = now()
FROM level2_numbered ln
WHERE dc.id = ln.id;

-- 7c: Level 3 ordering (grandchildren with display_label2)
WITH parent_sort AS (
  SELECT id, display_group, display_label, sort_order
  FROM display_categories
  WHERE parent_id IS NOT NULL AND display_label2 IS NULL
),
level3_numbered AS (
  SELECT
    dc.id,
    ps.sort_order AS parent_sort,
    ROW_NUMBER() OVER (
      PARTITION BY dc.display_group, dc.display_label
      ORDER BY dc.display_label2
    ) * 0.1 AS sub_order
  FROM display_categories dc
  JOIN parent_sort ps
    ON dc.display_group = ps.display_group
    AND dc.display_label = ps.display_label
  WHERE dc.display_label2 IS NOT NULL
)
UPDATE display_categories dc
SET sort_order = ln.parent_sort + ln.sub_order,
    updated_at = now()
FROM level3_numbered ln
WHERE dc.id = ln.id;

-- Cleanup temp tables
DROP TABLE IF EXISTS correct_parents;
DROP TABLE IF EXISTS duplicate_parents;

COMMIT;
