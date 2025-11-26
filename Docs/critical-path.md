# Cash Flow App – Critical Path

---

## 1.3 Implement Core Database Schema

### Tables Implemented
- `user_profiles`
- `raw_transactions`
- `bank_accounts`
- `exclusion_rules`
- `classified_bank_transactions`
- `holidays`
- `payment_rules`
- `import_history`

These tables form the foundational data model for ingestion, classification, forecasting, and rule-based automation.

---

## 2. Data Ingestion Pipeline

### 2.1 CSV Parser
Handles:
- Skipping report preamble rows  
- Extracting header row  
- Normalizing headers into internal keys  
- Removing trailing summary/footer rows  
- Producing structured `RawCSVRow[]`

### 2.2 CSV Validator
Enforces ingestion rules:
- Required fields present:
  - `distribution_account`
  - `transaction_date`
  - `transaction_type`
  - `amount`
- Account must be one of: `1000`, `1010`, `1015`, `1020`
- Exclude transaction types: `Transfer`, `Journal Entry`
- Validate numeric amount and valid date

### 2.3 Transaction Mapper
Maps validated CSV rows → internal model:
- `date`
- `amount`
- `description`
- `transaction_type`
- `source_system = "quickbooks"`
- `source_id` (dedupe key)
- `qb_account_number`
- `qb_account_name`
- `metadata` (extensible)

### 2.4 Import Service
Coordinates full ingestion:
- Parse → validate → map  
- Perform duplicate detection  
- Insert into `raw_transactions`  
- Record errors and counts  
- Return a structured `CSVImportResult`

### 2.5 Import UI
User-facing features:
- CSV upload  
- Display progress and validation errors  
- Show import results  
- Accessible to authorized roles

### 2.6 Recent Improvements
- Fixed header normalization (`Transaction date` → `transaction_date`)
- Unified normalization logic between parser and validator
- Added support for special characters/slashes (`Memo/Description` → `memo_description`)

✅ **Milestone:** The ingestion pipeline now imports real QuickBooks Transaction Detail CSVs with row-level validation and clean insertion into `raw_transactions`.

---

## 3. Classification Engine

**Purpose:** Convert raw imported rows into categorized transactions.

### 3.1 Classification Modules Implemented

#### `types.ts`
- `RawTxInput` interface (matches `raw_transactions` schema)
- `ClassificationRecord` for classification results
- `ClassificationRule` for rule definitions

#### `rules.ts` – Deterministic Rules Engine
- **GL Account-based classification**
  - Maps accounts (1000, 1010, 1020, etc.)
  - Handles Labor (5xxx), COGS (4xxx), Opex (6xxx)
  - Supports AR/AP (1200, 2010) and Cash accounts  
- **Keyword-based rules**
  - Payroll, Rent, Utilities, Bank Fees, Rewards  
- **Priority-based weighted matching**

#### `historical.ts` – Historical Inference
- Queries past classifications by GL account  
- Finds similar transactions by 60%+ word overlap  
- Weighted voting; 70%+ consensus required  

#### `mlAssist.ts` – ML Integration Stub
- Placeholder for v2 ML-based classification  

#### `engine.ts` – Main Engine
Decision tree:
1. Skip if manual classification exists  
2. Try deterministic rules  
3. Try historical inference  
4. Try ML suggestion (stub)  
5. Default to “Unclassified”

Batch processing: `classifyBatch(limit)`  
Reclassification: `reclassifyTransaction()`  
System user ID used for automated entries  

### 3.2 Classification Output
Writes to `classified_bank_transactions`:
- `transaction_id` (FK)
- `classification`
- `classification_source`
- `rule_id` (optional)
- `confidence_score` (null v1)
- `notes`
- `classified_at`, `classified_by`

### 3.3 API Endpoint
`POST /api/classification/run`  
Processes unclassified transactions, applies full decision tree, reports summary.

### 3.4 Design Mockups Created
- `verification-inbox.html`
- `master-ledger.html`
- `forecast-spreadsheet.html`
- `payment-rules.html`
- `ar-forecast.html`

✅ **Milestone:** Complete classification engine with deterministic rules, historical inference, ML stubs, and full audit trail.

---

## 3.5 Display Category Hierarchy Architecture (Critical Mid-Build Correction)

### The Problem
When importing real categories (Payroll, Rent, Software, etc.), issues arose:
- **COGS requires 3-level hierarchy:**  
  - `COGS → Hardware → Nurse Call`  
  - `COGS → Software → PXP`
- Expense-card drilldowns more granular (e.g., Mileage → Construction)
- Forecast spreadsheet needs stable top-level categories  
- Duplicate parent rows caused aggregation errors  

### The Key Insight
A single table can support all operations with:
- `scope` for forecast vs card categories  
- `display_label2` for true 3-level hierarchies  
- Stable `category_code`  
- Correct parent rows for each display group  

### What We Did
- Inserted validated parent rows  
- Reparented duplicates and rebuilt hierarchy  
- Rebuilt `sort_order`:
  1. AR → Labor → Facilities → Software → Insurance → Taxes → NL Opex → Expense Card → COGS → Misc  
  2. Alphabetical within group  
  3. Fractional ordering for level 3  
- Cleaned `category_code` values  

### Why It Was Necessary
This ensured:
- Forecast rows align with true business categories  
- Expense-card drilldowns remain granular  
- Reliable classification mapping  
- Stable display and row ordering  
- Unified semantic vocabulary  

✅ **Outcome:** Structural stability achieved; safe to proceed to Verification Inbox (Section 4).

---

# 4. Verification Inbox & Manual Review

Purpose: CFO workflow for reviewing, correcting, and verifying auto-classified transactions before they enter the forecast.

## 4.1 Database Schema Updates

### Verification Columns Added to classified_bank_transactions
```sql
ALTER TABLE classified_bank_transactions
ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN verified_at TIMESTAMPTZ,
ADD COLUMN verified_by TEXT;
```
- **is_verified**: Indicates human review completion
- **verified_at**: Timestamp of verification
- **verified_by**: User identifier (e.g., 'CFO')
- Partial index on `is_verified = false` for fast unverified queries

### Foreign Key Constraint
```sql
ALTER TABLE classified_bank_transactions
ADD CONSTRAINT fk_category_code
FOREIGN KEY (category_code)
REFERENCES display_categories(category_code);
```
- Required by PostgREST for JOIN operations in API queries
- Enforces referential integrity at database level

## 4.2 Verification Inbox UI (/app/verification)

### Page Layout
- **Header:** Forest green gradient title, Export/Verify All buttons, CFO badge
- **Main Grid:** High-density table with transaction details
- **Stats Sidebar:** Pending count, total amount, needs classification count
- **Bulk Actions:** Appears when rows selected

### Table Features
- ✅ **Checkbox selection** with select all
- ✅ **Sort by date** (newest first, sorted in JavaScript)
- ✅ **Column headers:** Date, Vendor, Amount, Classification, Source, Actions
- ✅ **Classification chips:** Purple (category), Orange (subcategory), Blue (subtype)
- ✅ **Color-coded amounts:** Red negative, Green positive
- ✅ **Row selection:** Blue gradient background on selected
- ✅ **Hover effects:** Light forest green tint

### Design System
- **Forest green palette:** `#1e3a1e`, `#2d5a2d`, `#3d6b3d`
- **Glassmorphic effects:** `backdrop-blur(20px-24px)`, semi-transparent white cards
- **Typography:** Font-weight 650 (titles), 580 (vendors), 600 (chips), 550 (buttons)
- **Letter spacing:** -0.014em (body), -0.02em (headings), 0.02em (uppercase)
- **Shadows:** `0 4px 24px rgba(30, 58, 30, 0.04)`
- **Borders:** `rgba(30, 58, 30, 0.08)`

## 4.3 API Endpoints

### GET /api/verification/unverified
Fetches unverified transactions with joined category details:
```typescript
.from("classified_bank_transactions")
.select(`
  id, transaction_id, category_code,
  transaction:raw_transactions (date, amount, name, description, source_system, transaction_type, qb_account_name),
  category:display_categories (display_group, display_label, display_label2, cash_direction)
`)
.eq("is_verified", false)
```
- PostgREST FK-based joins (no hints needed)
- Sorting moved to JavaScript (PostgREST doesn't support ordering by joined columns)
- Returns 3-level category hierarchy with transaction context

### POST /api/verification/verify
Bulk verify transactions:
```typescript
.update({
  is_verified: true,
  verified_at: NOW(),
  verified_by: 'CFO'
})
.in("id", ids)
```
- Accepts array of classification IDs
- Marks transactions as verified
- Returns count of updated records

### GET /api/verification/categories
Fetches all available categories for editing:
```typescript
.from("display_categories")
.select("category_code, display_group, display_label, display_label2")
.not("category_code", "is", null)
.order("display_group", "display_label")
```
- Filters out null category_codes
- Returns sorted category list for dropdown
- Grouped by display_group

### POST /api/verification/edit
Update transaction classification:
```typescript
.update({
  category_code: $category_code,
  classification_source: 'manual',
  classified_at: NOW()
})
.eq("id", $id)
```
- Changes category to user selection
- Marks as manual classification
- Updates timestamp

## 4.4 Verify Button Implementation

### Individual Verify
- Button on each table row
- `onClick={() => handleVerify(tx.id)}`
- Updates single transaction
- Removes from unverified list immediately

### Bulk Verify Selected
- Button in sidebar when rows selected
- `onClick={() => handleVerify(Array.from(selectedIds))}`
- Verifies multiple transactions at once
- Clears selection after success

### Verify All
- Button in header
- `onClick={() => handleVerify(transactions.map(t => t.id))}`
- Verifies entire unverified inbox
- Confirms action before proceeding

### Behavior
1. POST to `/api/verification/verify` with IDs
2. On success: Clear selections, refresh unverified list
3. Verified transactions disappear from inbox
4. Stats update to reflect new counts

## 4.5 Edit Modal (Searchable Category Selection)

### EditTransactionModal Component
- **Technology:** Headless UI Combobox with real-time search
- **Design:** Glassmorphic overlay with forest green accents
- **Transaction context:** Vendor, amount, date, description displayed at top

### Searchable Combobox Features
- ✅ **Type-to-search:** Case-insensitive substring matching
- ✅ **Filter as you type:** Real-time category filtering
- ✅ **Keyboard navigation:** ↑↓ arrows, Enter to select, Escape to close
- ✅ **Display format:** "AR > AR Collections" or "COGS > Hardware > Nurse Call"
- ✅ **Empty state:** "No categories found" when no matches
- ✅ **Selected state:** Forest green gradient background `#2d5a2d → #3d6b3d`
- ✅ **Hover state:** Light forest tint `rgba(240, 248, 242, 0.5)`

### Dropdown Styling
- **Input border:** `rgba(30, 58, 30, 0.15)`
- **Focus ring:** `3px rgba(45, 90, 45, 0.1)` shadow with `#2d5a2d` border
- **Dropdown background:** White gradient with `blur(20px)` backdrop
- **Typography:** Font-weight 500, letter-spacing -0.01em
- **Options:** Render prop pattern to access active/selected states

### Edit Flow
1. User clicks Edit button on transaction row
2. Modal opens with transaction details and current category
3. User types to search categories (e.g., "payroll", "cogs hardware")
4. User selects new category from filtered list
5. Click Save → POST to `/api/verification/edit`
6. On success: Modal closes, transaction list refreshes with new classification
7. Classification source automatically set to 'manual'

### Defensive Filtering
- **Database level:** Query excludes `category_code IS NULL`
- **API level:** Logs warnings for null category_codes
- **UI level:** Filters null values before rendering
- **Fallback key:** Uses `index` if null slips through

## 4.6 Data Flow

```
classified_bank_transactions (is_verified = false)
  → GET /api/verification/unverified
    → JOIN display_categories via category_code FK
      → VerificationPage (/app/verification)
        → Table display with Verify/Edit buttons
          → EditTransactionModal (category search/select)
            → POST /api/verification/edit (update classification)
          → Verify button
            → POST /api/verification/verify (mark verified)
              → Transaction removed from inbox
```

## 4.7 Benefits

1. **Quality Control:** Human review catches ML/rule errors before forecast
2. **Audit Trail:** is_verified flag tracks manual review completion
3. **Bulk Operations:** Efficient CFO workflow with multi-select
4. **Searchable Edit:** Fast category correction with typeahead
5. **Real-time Updates:** Transactions disappear after verification
6. **Clear Status:** Stats sidebar shows pending work at a glance

✅ **Milestone Reached:** Complete verification workflow with searchable edit modal, bulk operations, and forest green design. CFO can review, correct, and verify all auto-classified transactions before they enter the forecast.

---

# 5. Forecast Engine

Purpose: Weekly cash flow aggregation with historical actuals.

## 5.1 Database Schema Updates

### category_code Addition
- Added `category_code` column to `classified_bank_transactions` (indexed)
- Updated classification engine to output `category_code` matching `display_categories.category_code`
- Enables direct joins between transactions and display hierarchy
- Kept old `classification` field for debugging (deprecated)

### cash_balances Table
```sql
CREATE TABLE cash_balances (
  id uuid PRIMARY KEY,
  bank_account text NOT NULL,
  as_of_date date NOT NULL,
  balance numeric NOT NULL,
  notes text,
  entered_by uuid REFERENCES user_profiles(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(bank_account, as_of_date)
);
```
- Manual CFO entry of starting cash positions
- Used as "Beginning Cash" in forecast grid
- V1: Single manual entry
- V2: Automated reconciliation

## 5.2 Classification Engine Updates

Updated all classification modules to output `category_code`:

### rules.ts
- GL account rules map to specific category codes (e.g., `labor_payroll`, `facilities_rent`)
- Keyword rules output structured `{ categoryCode, label }` format
- Prefix matching for account ranges (5xxx → Labor, 6xxx → Opex)

### engine.ts
- Writes `category_code` to database in all insert/update operations
- Default unclassified → `other_other` category code
- Batch processing updated to include category_code

## 5.3 Forecast Service Implementation

### lib/forecast/types.ts
```typescript
interface WeeklyForecast {
  weekEnding: string;
  beginningCash: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  endingCash: number;
  categories: CategoryForecast[];
}

interface CategoryForecast {
  displayGroup: string;
  displayLabel: string;
  displayLabel2?: string | null;
  categoryCode: string;
  cashDirection: "Cashin" | "Cashout";
  amount: number;
  transactionCount: number;
  isActual: boolean;
  sortOrder: number;
}
```

### lib/forecast/forecast-service.ts
Core weekly aggregation logic:
- Groups transactions by week-ending (Sunday)
- Joins `classified_bank_transactions` → `display_categories` via `category_code`
- **AR split logic:**
  - "AR Collections" = positive amounts where `qb_account_name` contains "1200 Accounts Receivable"
  - "Other Revenue" = other positive amounts on cash accounts (1000/1010/1015/1020)
- Calculates running cash balances (beginning → inflows → outflows → ending)
- Returns categories sorted by `display_categories.sort_order`

### API Endpoint
`GET /api/forecast/weeks`
- Query parameters: `startDate`, `endDate`, `weeksCount` (defaults to 14)
- Returns structured `ForecastResult` with weekly data
- V1 scope: **Historical/actual weeks only** (up to latest transaction date)
- Future weeks show $0/blank with placeholder (payment rules deferred to Section 7)

## 5.4 Data Flow

```
raw_transactions
  → classified_bank_transactions (category_code)
    → display_categories (hierarchy, labels, sort_order)
      → ForecastService (weekly aggregation)
        → GET /api/forecast/weeks (JSON response)
          → ForecastGrid (UI display)
```

**Milestone Reached:**
Complete forecast engine with category_code mapping, weekly aggregation, AR split logic, and running cash balances. Historical actuals only; future projections deferred to payment rules.

---

# 6. Forecast Dashboard (Excel-Style Grid)

Purpose: Dynamic React implementation matching `forecast-spreadsheet.html` design.

## 6.1 Technology Stack
- **Grid:** AG-Grid Community Edition (`ag-grid-community` + `ag-grid-react`)
- **Framework:** Next.js 14 with React Server Components
- **Styling:** Tailwind CSS with custom AG-Grid theme
- **Route:** `/app/forecast/page.tsx` → `/forecast`

## 6.2 Components Implemented

### `/app/forecast/page.tsx`
Main forecast page with:
- Sticky header with gradient background matching mockup
- "Set Beginning Cash" and "Export" buttons (stubs)
- CFO role badge
- ControlsBar integration
- ForecastGrid integration
- AgGridProvider for module registration

### `/app/forecast/components/ForecastGrid.tsx`
AG-Grid implementation with:
- ✅ **Frozen first column** with category labels
- ✅ **Dynamic week-ending columns** (26 weeks)
- ✅ **Horizontal infinite scroll**
- ✅ **Section headers** (CASH BALANCE, CASH INFLOWS, LABOR, COGS, FACILITIES, NL OPEX)
- ✅ **Total rows** (Total Inflows, Total Outflows, Net Cash Flow)
- ✅ **Pinned rows** (Beginning Cash, Ending Cash)
- ✅ **Currency formatting** with $ and commas
- ✅ **Color coding:** Green (#059669) positive, Red (#dc2626) negative
- ✅ **Cell double-click** → DetailModal
- ✅ **Actual vs Forecast** visual distinction (font-weight, opacity)
- ✅ **Custom AG-Grid theme** (glassmorphic, subtle gradients)
- ✅ **Row height:** 36px, **Header height:** 44px

### `/app/forecast/components/DetailModal.tsx`
Transaction detail modal with:
- Glassmorphic design matching mockup
- Header with category, week-ending date, close button
- Total amount display with color coding
- Transaction list (ready for real data integration)
- "Edit Rule" button (stub)
- Escape key and backdrop click to close
- Smooth animations and transitions

### `/app/forecast/components/ControlsBar.tsx`
Top controls bar with:
- Filter chips (All, Actuals, Forecast) with active state styling
- Status text showing week count and last updated timestamp
- Glassmorphic styling matching mockup
- Future: Date range picker integration

### `/app/forecast/components/AgGridProvider.tsx`
Module registration to resolve AG-Grid error #272:
```tsx
ModuleRegistry.registerModules([AllCommunityModule]);
```

## 6.3 Visual Design Match

Exact replication of `forecast-spreadsheet.html`:
- ✅ Geist-like font family (`-apple-system, BlinkMacSystemFont, 'SF Pro Display'`)
- ✅ Subtle gradients (green #1e3a1e → #2d5a2d → #3d6b3d on headers)
- ✅ Glassmorphic effects (`backdrop-blur`, `from-white/95`, transparency layers)
- ✅ Consistent spacing (px-6, py-3, gap-3)
- ✅ Density and font sizes (12px body, 11px headers)
- ✅ Section headers: bold, uppercase, tracking-wide
- ✅ Total rows: subtle background, border-top separator
- ✅ Clean AG-Grid theme (no heavy borders, subtle row hover)

## 6.4 Data Integration

Grid fetches from `GET /api/forecast/weeks?weeksCount=26` and:
- Transforms API response into AG-Grid row format
- Groups categories by `display_group`
- Sorts by `sort_order` from `display_categories`
- Handles AR split (AR Collections vs Other Revenue)
- Calculates running cash balances per week
- Distinguishes actual vs forecast values

## 6.5 Grid Features

- **Pinned left column** for category names (220px width)
- **Horizontal scroll** for 26+ weeks
- **Row grouping** by section (CASH BALANCE, INFLOWS, LABOR, COGS, etc.)
- **Custom cell rendering** with currency formatting and color coding
- **Hover states** on rows (subtle background change)
- **Click handling** disabled (only double-click opens modal)
- **Responsive** (V1: desktop optimized; mobile: future enhancement)

## 6.6 Outstanding V1 Items

- [ ] Mobile responsive layout (collapse to vertical cards)
- [ ] Export functionality implementation
- [ ] "Set Beginning Cash" modal integration
- [ ] Real transaction data in DetailModal (requires new API endpoint)
- [ ] Date range picker for controls bar
- [ ] Snapshot/version system for "as-of" reporting

**Milestone Reached:**
Complete forecast dashboard with AG-Grid, matching mockup design exactly. Fully functional with 26-week scroll, section grouping, running cash balances, and detail modal. Ready for production use with historical data.

---

## 7. Payment Rules Engine (Step 1: Solo MVP)

**Purpose:** Generate synthetic future transactions for recurring outflows to populate forecast weeks beyond historical data.

### 7.1 Payment Rules UI
- Forest green design matching verification inbox and forecast dashboard
- Glassmorphic cards with subtle gradients
- Table view with vendor, category, frequency, amount, next payment date
- Add/Edit/Delete buttons with modal workflows
- Active/inactive toggle for seasonal rules

### 7.2 Rule Creation & Management
Core fields for rule definition:
- **Vendor name** (e.g., "ADP Payroll", "Landlord - Main Office")
- **Category code** (FK to `display_categories.category_code`)
- **Frequency** (weekly, biweekly, monthly, quarterly, annual, custom)
- **Anchor day** (day of week for weekly, day of month for monthly, or specific date)
- **Amount** (fixed dollar value)
- **Start date** and optional end date
- **Active status** (boolean)

### 7.3 Schema Simplification
**Remove obligatory/discretionary distinction:**
- Delete `is_obligatory` column from `payment_rules` table (if exists)
- Remove from UI/API completely
- All rules are treated equally in forecast projection
- Rationale: Over-engineered for Solo MVP; adds no CFO value

### 7.4 Payment Rule Engine
Core algorithm for generating synthetic transactions:
```typescript
function generateProjectedPayments(rules: PaymentRule[], startDate: Date, endDate: Date) {
  // For each active rule:
  //   1. Calculate next occurrence after startDate using frequency + anchor
  //   2. Apply business day adjustment (skip weekends/holidays)
  //   3. Generate payment record with rule_id reference
  //   4. Repeat until endDate reached
  //   5. Return synthetic transactions array
}
```

### 7.5 Business Day Logic
Integration with `holidays` table:
- Check if calculated payment date falls on weekend
- Check if date exists in `holidays` table
- If true: shift to previous business day (default) or next business day (configurable)
- Edge case: Multiple consecutive holidays (iterate until valid business day found)

### 7.6 Forecast Integration
Merge synthetic and actual transactions:
- Actual weeks: Show only `classified_bank_transactions` (historical data)
- Future weeks: Show only synthetic payments from active rules
- Cutoff: Latest transaction date in `raw_transactions`
- Visual distinction: Font-weight 400 (forecast) vs 600 (actual), opacity 0.7 vs 1.0
- DetailModal: Show "Projected from Rule: [Vendor]" instead of transaction list

**API Endpoint:**
`GET /api/forecast/weeks` updated to:
- Fetch historical actuals (existing logic)
- Call `generateProjectedPayments()` for future weeks
- Merge and sort by week-ending date
- Return unified weekly forecast array

✅ **Milestone:** Payment rules engine complete. Forecast now shows 26+ weeks with future projections from recurring outflows. CFO can model runway with real recurring costs.

---

## 8. AR Estimation Module (Step 1: Solo MVP)

**Purpose:** Manual 4-week rolling AR forecast to populate "AR Collections" inflows in future weeks.

### 8.1 AR Forecast UI
- Forest green design matching verification inbox mockup (`ar-forecast.html`)
- Glassmorphic table with 4-week columns
- Row per customer with editable invoice details
- Color-coded confidence levels (High = green, Medium = yellow, Low = red)
- Add/Edit/Delete invoice rows
- Total expected collections per week displayed

### 8.2 Manual 4-Week Inputs
Core fields for AR forecast entries:
- **Customer name** (e.g., "Community Hospital - East Wing")
- **Invoice number** (optional reference)
- **Expected amount** (dollar value)
- **Expected payment date** (specific date or week)
- **Confidence level** (High 90%, Medium 70%, Low 40%)
- **Notes** (e.g., "Pending approval", "Payment plan")

Database table: `ar_forecast_entries`
```sql
CREATE TABLE ar_forecast_entries (
  id uuid PRIMARY KEY,
  customer_name text NOT NULL,
  invoice_number text,
  expected_amount numeric NOT NULL,
  expected_date date NOT NULL,
  confidence_level text CHECK (confidence_level IN ('high', 'medium', 'low')),
  confidence_multiplier numeric DEFAULT 1.0,
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 8.3 Forecast Integration
Merge AR forecast with actual collections:
- Historical weeks: Show actual "AR Collections" from `classified_bank_transactions`
- Future weeks: Show sum of `expected_amount × confidence_multiplier` for that week
- Display in "AR Collections" row (first inflow row in CASH INFLOWS section)
- Visual distinction: Same opacity/font-weight as payment rule projections

### 8.4 Confidence-Weighted Amounts
Apply confidence multipliers:
- **High confidence (90%):** `expected_amount × 0.9`
- **Medium confidence (70%):** `expected_amount × 0.7`
- **Low confidence (40%):** `expected_amount × 0.4`
- Rationale: Conservative forecasting; avoid over-projecting runway

### 8.5 Visual Distinction from Actuals
Forecast grid styling for AR estimates:
- Font-weight 400 (vs 600 for actuals)
- Opacity 0.7 (vs 1.0 for actuals)
- Italicized text
- DetailModal: Show "Projected from AR Forecast: [Customer] - [Invoice]" with confidence chip

**API Endpoint:**
`GET /api/forecast/weeks` updated to:
- Fetch historical AR actuals (existing AR Collections logic)
- Query `ar_forecast_entries` for future dates
- Apply confidence multipliers
- Group by week-ending date
- Return AR Collections with forecast flag

### 8.6 CSV Import Redesign
Polish existing `/app/import` page:
- Replace generic styling with forest green theme
- Glassmorphic file upload card matching other pages
- Progress indicators with forest green color scheme
- Error messages in red toast notifications (not inline text)
- Success summary in green toast notification
- Validation warnings displayed in amber chips

### 8.7 Database Cleanup Audit
Schema hygiene before multi-user rollout:
- [ ] Remove unused columns from all tables
- [ ] Document all foreign key relationships
- [ ] Add missing indexes (e.g., `category_code`, `is_verified`, `date`)
- [ ] Update column comments for clarity
- [ ] Create database diagram (dbdiagram.io or similar)
- [ ] Export clean schema.sql for version control

### 8.8 Error Toasts & Loading Spinners
Consistent UI feedback patterns:
- **Toast library:** `react-hot-toast` or `sonner`
- **Loading states:** Skeleton loaders for tables, spinners for buttons
- **Error handling:** API errors → red toast, success → green toast
- **Forest green toast theme:** Match button/header gradients
- Apply to: Import, Verification, Forecast, AR Forecast, Payment Rules

### 8.9 "Set Beginning Cash" Modal
Implement stub button in forecast header:
- Modal with glassmorphic design
- Input fields: Bank account dropdown, As-of date picker, Balance amount
- Inserts into `cash_balances` table
- Updates "Beginning Cash" row in forecast grid
- Validation: Prevent duplicate entries for same account/date combination
- Use existing `cash_balances` table schema (Section 5.1)

✅ **Milestone:** Solo MVP complete. Full 26-week forecast with payment rules, AR estimates, manual cash entries, and polished UX. Ready for multi-user testing with Travis, Controller, and Sr Accountant.

---

## 9. Multi-User Foundation (Step 2: Testing Phase)

**Purpose:** Enable secure multi-user access for 3-5 power users (Travis, Controller, Sr Accountant) with proper authentication, audit trails, and import safety.

### 9.1 Supabase Authentication Setup
- Enable Auth in Supabase project settings
- Configure email/password provider (no OAuth needed for v1)
- Set up RLS (Row Level Security) policies on all tables
- Create auth middleware for Next.js API routes
- Update `user_profiles` table to sync with `auth.users`

### 9.2 Auth UI Components
- Login page at `/login` with forest green design
- Sign-up page at `/signup` (initially disabled; manual user creation only)
- Password reset flow
- Session management with Supabase client
- Protected routes: Redirect to `/login` if unauthenticated
- Logout button in header with user email display

### 9.3 Hardcoded Power Users
Manual user provisioning for initial testing:
- **Travis Reed** (travis@company.com) - Admin role
- **Controller** (controller@company.com) - Power user role
- **Sr Accountant** (accountant@company.com) - Power user role
- Insert directly into `auth.users` via Supabase dashboard
- No self-service signup; all accounts created by Travis

### 9.4 Real verified_by from Auth Session
Update verification workflow:
- Replace hardcoded `"CFO"` with `session.user.email` or `user_id`
- Update `classified_bank_transactions.verified_by` column to uuid FK
- Display actual user name in verification history
- Same for `created_by` in `ar_forecast_entries` and `payment_rules`

### 9.5 CSV Import Safety
Prevent duplicate imports and data corruption:
- **File hash:** Calculate SHA-256 of uploaded CSV, store in `import_history.file_hash`
- **Duplicate detection:** Check if file_hash exists before processing
- **Transaction wrapper:** All imports in single database transaction (rollback on error)
- **User attribution:** Record `imported_by` user_id in `import_history`
- **Warning UI:** Show alert if importing same file twice

### 9.6 Import History Tracking
Expand `import_history` table:
```sql
ALTER TABLE import_history ADD COLUMN file_hash text;
ALTER TABLE import_history ADD COLUMN imported_by uuid REFERENCES user_profiles(id);
ALTER TABLE import_history ADD COLUMN rows_imported int;
ALTER TABLE import_history ADD COLUMN rows_skipped int;
ALTER TABLE import_history ADD COLUMN import_duration_ms int;
CREATE INDEX idx_import_history_file_hash ON import_history(file_hash);
```

Display in `/app/import/history` page:
- Table of all imports with user, timestamp, file name, counts
- Filter by date range and user
- "View Details" → modal with error log and skipped rows

### 9.7 Production Deployment (Vercel)
Deploy to Vercel with environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Custom domain: `forecast.company.com` (optional)
- HTTPS enforced
- Enable Vercel Analytics (optional)

### 9.8 Feedback Collection Process
Real-world usage testing (2-4 weeks):
- **Weekly check-ins:** Travis meets with Controller + Sr Accountant
- **Bug tracking:** Notion or Linear for issue reporting
- **Feature requests:** Prioritize top 3 pain points for v1.1
- **Data validation:** Compare forecast accuracy to actual results
- **Performance monitoring:** Check page load times, query performance

✅ **Milestone:** Multi-user foundation complete. 3-5 power users actively using the system with authentication, audit trails, and production deployment. Ready for leadership view-only access.

---

## 10. Leadership View Access (Step 3: Executive Rollout)

**Purpose:** Grant view-only access to 5 leadership users (CEO, CFO, COO, etc.) with RBAC enforcement at UI and API levels.

### 10.1 User Roles Table
Extend `user_profiles` with role column:
```sql
ALTER TABLE user_profiles ADD COLUMN role text CHECK (role IN ('admin', 'power_user', 'view_only'));
UPDATE user_profiles SET role = 'power_user' WHERE email IN ('travis@company.com', 'controller@company.com', 'accountant@company.com');
```

Role definitions:
- **admin:** Full access (Travis only)
- **power_user:** Edit/import/verify permissions (Controller, Sr Accountant)
- **view_only:** Read-only access to forecast dashboard only (Leadership)

### 10.2 RBAC UI Implementation
Conditional rendering based on role:
- Hide Import button if `role === 'view_only'`
- Hide Verify/Edit buttons in verification inbox if `role === 'view_only'`
- Hide "Add Rule" button in payment rules if `role === 'view_only'`
- Hide "Set Beginning Cash" if `role === 'view_only'`
- Show "View Only" badge in header for `view_only` users

### 10.3 RBAC API Enforcement
Server-side permission checks in API routes:
```typescript
// /api/verification/verify/route.ts
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('id', session.user.id)
  .single();

if (profile.role === 'view_only') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

Apply to:
- POST `/api/verification/verify`
- POST `/api/verification/edit`
- POST `/api/import`
- POST `/api/payment-rules`
- POST `/api/ar-forecast`

### 10.4 Leadership Invites
Manual provisioning for 5 leadership users:
- Create accounts in Supabase dashboard
- Set `role = 'view_only'` in `user_profiles`
- Send login credentials via secure channel
- Provide 5-minute onboarding video (Loom)
- Grant access to `/forecast` only (redirect `/verification`, `/import`, etc. to `/forecast`)

### 10.5 Scale Features (As Needed)
Monitor performance after adding 5 view-only users. If needed:
- **Pagination:** Limit verification inbox to 100 rows per page
- **Search/Filter:** Add vendor search bar in verification inbox
- **Audit Trail:** Log all user actions (verify, edit, import) to `audit_log` table
- **Database indexes:** Ensure all queries use indexes (check `EXPLAIN ANALYZE`)
- **Caching:** Redis for forecast API responses (if needed)

✅ **Milestone:** Full team access complete (8-10 total users). Core V1 shipped. Leadership can view forecasts; power users maintain data. System stable under real-world usage.

---

## 11. Future Enhancements (Post-V1)

### 11.1 Scenario Modeling (Step 4 - Separate Epic)
**Purpose:** "What-if" analysis for hiring, terminations, and cost changes.

#### Baseline Snapshots
- Save current forecast state as "Baseline" scenario
- Clone baseline to create new scenario
- Scenarios stored in `forecast_scenarios` table with snapshot date

#### What-If Adjustments
- **Hire employee:** Add new row to Labor category with start date, salary, burden rate
- **Fire employee:** Remove row or set end date
- **Cost change:** Adjust payment rule amount (e.g., rent increase)
- **Budget vs Actual:** Compare scenario to actual results over time

#### Scenario Comparison UI
- Dropdown in forecast header to switch between scenarios
- Side-by-side view: Baseline vs Scenario A
- Diff highlighting (green = favorable, red = unfavorable)
- Impact summary: "This hire extends runway by 8 weeks" or "reduces cash by $50K"

#### Employee Cost Engine
Fully burdened cost calculation:
- **Base salary**
- **Payroll taxes** (7.65% FICA)
- **Benefits** (health, 401k match, PTO accrual)
- **Overhead allocation** (% of facilities, IT, admin costs)
- Returns single monthly cost per employee

#### Budget vs Actual Variance
- Import budget from Excel or manual entry
- Compare budget scenario to actual results
- Variance report: Category-level over/under analysis
- Alerts: Flag categories >10% over budget

**Note:** Scenario modeling is a separate epic, not blocking V1 launch. Prioritize based on user feedback from Step 3.

### 11.2 Export Capabilities
- **Excel export:** Download forecast grid as .xlsx with formatting
- **PDF reports:** Generate executive summary with charts
- **API export:** JSON endpoint for integrations (e.g., Slack bot)

### 11.3 Additional Future Ideas
- **Mobile responsive:** Optimize forecast grid for tablet/phone
- **Slack notifications:** Daily digest of unverified transactions
- **QuickBooks OAuth:** Direct API sync (no CSV import)
- **ML classification v2:** Fine-tune model with verified data
- **Anomaly detection:** Flag unusual transactions for review  

---

## ✅ Summary Critical Path

### Foundation (Complete ✅)
1. ✅ **Data ingestion pipeline** (Section 2)
2. ✅ **Classification engine** (Section 3)
3. ✅ **Display category hierarchy** (Section 3.5)
4. ✅ **Verification inbox** (Section 4)
5. ✅ **Forecast engine** (Section 5)
6. ✅ **Forecast dashboard** (Section 6)

### Step 1: Solo MVP (Sections 7-8) ← CURRENT FOCUS
7. **Payment rules engine** (Section 7.1-7.6)
8. **AR estimation module** (Section 8.1-8.5)
9. **Solo MVP polish** (Section 8.6-8.9)
   - CSV import redesign
   - Database cleanup audit
   - Error toasts & loading spinners
   - "Set Beginning Cash" modal

**Target:** Fully functional 26-week forecast for Travis (solo user)

### Step 2: Multi-User Foundation (Section 9)
10. **Supabase authentication** (9.1-9.2)
11. **Hardcoded power users** (9.3-9.4)
12. **CSV import safety** (9.5-9.6)
13. **Production deployment** (9.7)
14. **Feedback collection** (9.8)

**Target:** 3-5 power users testing in production (Travis, Controller, Sr Accountant)

### Step 3: Leadership View Access (Section 10)
15. **User roles & RBAC** (10.1-10.3)
16. **Leadership invites** (10.4)
17. **Scale features as needed** (10.5)

**Target:** 8-10 total users (5 view-only leadership + 3-5 power users)

### Step 4: Future Enhancements (Section 11)
18. **Scenario modeling** (11.1) - Separate epic, not blocking V1
19. **Export capabilities** (11.2)
20. **Additional ideas** (11.3)

---

## 🟢 Recent Completions

### Data Ingestion Pipeline (Sections 1-2)
- CSV parser with header normalization
- CSV validator with consistent field mapping
- Transaction mapper with QuickBooks support
- Import service with duplicate detection
- Import API endpoint at `/api/import`

### Classification Engine (Section 3)
- GL account-based classification rules
- Keyword-based classification rules
- Historical inference with similarity matching
- ML assist stub (ready for v2)
- Batch processing and reclassification
- Full audit trail with classification_source tracking
- Design mockups for all major views

### Display Category Hierarchy (Section 3.5)
- Fixed duplicate parent rows in display_categories
- Established clean 3-level hierarchy (group → label → label2)
- Rebuilt sort_order with CFO-friendly ordering
- Created `scope` field for forecast vs expense card categories
- Unique `category_code` values for reliable joins

### Verification Inbox (Section 4)
- Added verification columns to classified_bank_transactions
- Created foreign key constraint on category_code
- Built /app/verification page with forest green design
- Implemented Verify button with bulk operations
- Created EditTransactionModal with searchable Headless UI Combobox
- API endpoints: /api/verification/unverified, /verify, /edit, /categories
- Real-time search with case-insensitive filtering
- Defensive null handling at database, API, and UI levels
- Complete CFO workflow for reviewing and correcting classifications

### Forecast Engine (Section 5)
- Added `category_code` column to classified_bank_transactions
- Created `cash_balances` table for manual CFO entries
- Updated classification engine to output category_code
- Built ForecastService with weekly aggregation
- Implemented AR split logic (AR Collections vs Other Revenue)
- API endpoint: `GET /api/forecast/weeks` with date parameters
- V1: Historical actuals only (future projections deferred)

### Forecast Dashboard (Section 6)
- Implemented AG-Grid Community Edition
- Dynamic 26-week forecast grid at `/forecast`
- Frozen first column with category hierarchy
- Horizontal infinite scroll for weeks
- Section grouping (CASH BALANCE, INFLOWS, LABOR, COGS, etc.)
- Running cash balance calculations (beginning → ending)
- Currency formatting with color coding (green/red)
- DetailModal for transaction drill-downs
- ControlsBar with filter chips
- Custom AG-Grid theme matching mockup design
- Glassmorphic styling with subtle gradients

---

**This is the complete high-level roadmap for the Cash Flow Application.**