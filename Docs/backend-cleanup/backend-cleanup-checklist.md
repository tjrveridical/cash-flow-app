# Backend Cleanup Checklist - Solo MVP Foundation

**CRITICAL RULE: ONE STEP AT A TIME. WAIT FOR FEEDBACK BEFORE PROCEEDING.**

Use this document to systematically audit and clean up the codebase before integrating navigation and shipping to multi-user. Each step has a ✅ checkbox. Do not skip ahead.

---

## 🗺️ WHERE AM I?

Mark your current location:
- [ ] **SESSION 1: Database Schema Audit** (Est. 2 hours)
- [ ] **SESSION 2: API Routes Audit** (Est. 1.5 hours)  
- [ ] **SESSION 3: Frontend Pages Audit** (Est. 1 hour)
- [ ] **SESSION 4: Services & Lib Audit** (Est. 1 hour)
- [ ] **DONE: Backend Clean, Ready for Nav Integration**

---

## SESSION 1: Database Schema Audit

**Goal:** Remove unused tables, columns, and add missing indexes.

### Step 1.1: List All Tables
```bash
echo "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" | npx supabase db execute
```
**STOP.** Copy the output here and review it. Which tables do you recognize? Which look unfamiliar?

---

### Step 1.2: Check Table Sizes
```bash
echo "SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size('public.'||tablename) DESC;" | npx supabase db execute
```
**STOP.** Any tables with 0 rows or suspiciously large sizes? List them.

---

### Step 1.3: Inventory Known Tables

Copy this list and mark ✅ or ❌ for each:

**Core Tables (Should Exist):**
- [ ] `raw_transactions` - Bank transaction imports
- [ ] `classified_bank_transactions` - Classification layer
- [ ] `display_categories` - Category hierarchy
- [ ] `ar_forecast` - AR projections
- [ ] `payment_rules` - Paydate calculation templates
- [ ] `cash_balances` - Beginning cash entries
- [ ] `user_profiles` - User metadata

**Questionable Tables:**
- [ ] `forecast_items` - Is this used? Check if it has rows.
- [ ] `ar_forecast_entries` - Old V2 design? Should be deleted.
- [ ] Any tables with `_old`, `_backup`, `_test` suffixes?

**STOP.** Run this for each questionable table:
```bash
echo "SELECT COUNT(*) FROM [table_name];" | npx supabase db execute
```
Report which tables have 0 rows.

---

### Step 1.4: Decision Point - Drop Unused Tables

For each table with 0 rows you want to drop:
```bash
echo "DROP TABLE IF EXISTS [table_name] CASCADE;" | npx supabase db execute
```

**STOP AFTER EACH DROP.** Confirm it's gone:
```bash
echo "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = '[table_name]';" | npx supabase db execute
```

---

### Step 1.5: Check for Unused Columns

For each core table, list its columns:
```bash
echo "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '[table_name]' ORDER BY ordinal_position;" | npx supabase db execute
```

**STOP.** Do you recognize all columns? Any that look abandoned (e.g., `temp_field`, `old_amount`)?

---

### Step 1.6: Drop Unused Columns

If you find unused columns:
```bash
echo "ALTER TABLE [table_name] DROP COLUMN IF EXISTS [column_name];" | npx supabase db execute
```

**STOP AFTER EACH DROP.** Verify:
```bash
echo "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '[table_name]';" | npx supabase db execute
```

---

### Step 1.7: Add Missing Indexes

Check existing indexes:
```bash
echo "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;" | npx supabase db execute
```

**STOP.** Do you have indexes on:
- `raw_transactions.date`?
- `classified_bank_transactions.category_code`?
- `classified_bank_transactions.is_verified`?
- `ar_forecast.week_ending`?
- `payment_rules.rule_name`?

If missing, add them:
```bash
echo "CREATE INDEX IF NOT EXISTS idx_raw_transactions_date ON raw_transactions(date);" | npx supabase db execute
echo "CREATE INDEX IF NOT EXISTS idx_classified_category_code ON classified_bank_transactions(category_code);" | npx supabase db execute
echo "CREATE INDEX IF NOT EXISTS idx_classified_is_verified ON classified_bank_transactions(is_verified);" | npx supabase db execute
```

**STOP.** Verify indexes were created.

---

### Step 1.8: Document Final Schema

Create `/docs/database-schema.md` listing:
- Table name
- Purpose (one sentence)
- Key columns
- Relationships

**STOP.** Show me the list before proceeding to Session 2.

---

**✅ SESSION 1 COMPLETE** when:
- All unused tables dropped
- All unused columns dropped  
- Missing indexes added
- Schema documented

---

## SESSION 2: API Routes Audit

**Goal:** Remove unused API routes and consolidate duplicates.

### Step 2.1: List All API Routes
```bash
find app/api -name "route.ts" -o -name "route.js" | sort
```

**STOP.** Copy the output. How many routes do you have?

---

### Step 2.2: Inventory Known Routes

Mark ✅ or ❌ for each:

**Core Routes (Should Exist):**
- [ ] `/api/forecast/weeks` - Fetch forecast data
- [ ] `/api/ar-forecast` - GET/POST AR forecasts
- [ ] `/api/ar-forecast/[id]` - DELETE AR forecast
- [ ] `/api/paydate-rules` - GET/POST payment rules
- [ ] `/api/paydate-rules/[id]` - PUT/DELETE payment rules
- [ ] `/api/verify` - GET unverified transactions
- [ ] `/api/verify/[id]` - PUT update classification
- [ ] `/api/import` - POST CSV upload

**Questionable Routes:**
- [ ] `/api/forecast` (vs `/api/forecast/weeks`) - Duplicate?
- [ ] `/api/test/*` - Should be deleted
- [ ] Any routes you don't remember creating?

**STOP.** For each questionable route, search for its usage in the frontend:
```bash
grep -r "fetch('/api/[route-name]" app/
```

If no results, mark for deletion.

---

### Step 2.3: Delete Unused Routes

For each route to delete:
```bash
rm -rf app/api/[route-name]
```

**STOP AFTER EACH DELETE.** Verify it's gone:
```bash
ls app/api/[route-name]
```

---

### Step 2.4: Check for Duplicate Logic

Do any routes do similar things?

Example: Does `/api/forecast` do what `/api/forecast/weeks` does?

**STOP.** Show me any potential duplicates before consolidating.

---

### Step 2.5: Standardize Error Handling

Open 3-4 different route files. Do they all return errors the same way?

**Common patterns:**
- `return NextResponse.json({success: false, message: "..."})`
- `return NextResponse.json({error: "..."}, {status: 500})`

**STOP.** Which pattern should we standardize on? Decide before proceeding.

---

### Step 2.6: Document API Routes

Create `/docs/api-routes.md` listing:
- Endpoint
- Method (GET/POST/PUT/DELETE)
- Purpose (one sentence)
- Request body (if applicable)
- Response structure

**STOP.** Show me the list before proceeding to Session 3.

---

**✅ SESSION 2 COMPLETE** when:
- All unused routes deleted
- Duplicates consolidated
- Error handling standardized
- Routes documented

---

## SESSION 3: Frontend Pages Audit

**Goal:** Remove unused pages and consolidate components.

### Step 3.1: List All Pages
```bash
find app -name "page.tsx" -o -name "page.js" | grep -v node_modules | sort
```

**STOP.** Copy the output. How many pages do you have?

---

### Step 3.2: Inventory Known Pages

Mark ✅ or ❌ for each:

**Core Pages (Should Exist):**
- [ ] `/app/forecast/page.tsx` - Main forecast grid
- [ ] `/app/verify/page.tsx` - Verification inbox
- [ ] `/app/master-ledger/page.tsx` - Master ledger view
- [ ] `/app/paydate-rules/page.tsx` - Payment rules CRUD
- [ ] `/app/import/page.tsx` - CSV import
- [ ] `/app/page.tsx` - Landing/redirect

**Questionable Pages:**
- [ ] `/app/ar-forecast/page.tsx` - Now that inline editing works in /forecast?
- [ ] Any `/test` or `/demo` pages?
- [ ] Any pages you don't remember creating?

**STOP.** For each questionable page, decide: Keep or delete?

---

### Step 3.3: Delete Unused Pages

For each page to delete:
```bash
rm -rf app/[page-name]
```

**STOP AFTER EACH DELETE.** Try navigating to that route in the browser. Should 404.

---

### Step 3.4: List All Components
```bash
find app -name "*.tsx" -o -name "*.jsx" | grep -v page.tsx | grep -v layout.tsx | grep -v node_modules | sort
```

**STOP.** Copy the output. How many component files?

---

### Step 3.5: Find Orphaned Components

For each component file:
```bash
grep -r "import.*[ComponentName]" app/ | grep -v node_modules
```

If only one import (itself), it might be unused.

**STOP.** List any orphaned components before deleting.

---

### Step 3.6: Delete Orphaned Components

For each orphaned component:
```bash
rm app/[path-to-component].tsx
```

**STOP AFTER EACH DELETE.** Run dev server to check for import errors:
```bash
npm run dev
```

---

**✅ SESSION 3 COMPLETE** when:
- All unused pages deleted
- All orphaned components deleted
- Dev server starts without errors

---

## SESSION 4: Services & Lib Audit

**Goal:** Consolidate business logic and remove duplicate code.

### Step 4.1: List All Service/Lib Files
```bash
find lib -name "*.ts" -o -name "*.js" | sort
```

**STOP.** Copy the output. How many files?

---

### Step 4.2: Check for Duplicate Forecast Logic

Do you have both:
- `/lib/forecast/forecast-service.ts`
- `/lib/services/forecast-service.ts`

**STOP.** If yes, which one is actually used? Search:
```bash
grep -r "ForecastService" app/ | grep import
```

---

### Step 4.3: Consolidate Duplicate Services

If you have duplicates, keep one and update imports:
```bash
rm lib/[duplicate-file].ts
```

Then find/replace imports:
```bash
grep -r "from '@/lib/[old-path]" app/
```

**STOP.** Show me the list of files to update before proceeding.

---

### Step 4.4: Document Lib Structure

Create `/docs/lib-structure.md` listing:
- File path
- Purpose (one sentence)
- Key exports

**STOP.** Show me the list before marking Session 4 complete.

---

**✅ SESSION 4 COMPLETE** when:
- Duplicate services consolidated
- All imports updated
- Dev server runs without errors
- Lib structure documented

---

## 🎯 CLEANUP COMPLETE CHECKLIST

Before marking cleanup done, verify:
- [ ] Database has only tables you recognize and use
- [ ] All tables have appropriate indexes
- [ ] API routes are documented and non-duplicate
- [ ] Frontend pages match your mental model
- [ ] No orphaned components
- [ ] Services consolidated and documented
- [ ] Dev server starts cleanly
- [ ] All tests pass (if you have tests)

**Once all ✅ marks are complete, you're ready to integrate navigation.**

---

## 🚨 IF YOU GET STUCK

**Copy this template and send it:**
```
I'm stuck on: [Step X.X]
What I ran: [command]
What happened: [error or unexpected result]
What I expected: [expected behavior]
```

**Then STOP and wait for guidance.**

---

## AFTER CLEANUP: What's Next?

✅ Backend clean → Time to wire up navigation
✅ Navigation working → Polish UX and fix bugs  
✅ Bugs fixed → Ship to first users (Step 2)

**Do not proceed to navigation integration until all 4 sessions are complete.**