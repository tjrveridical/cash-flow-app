# Payment Rules Specification

Payment rules define recurring vendor payment schedules that the forecast engine uses to project future cash outflows.

---

## Purpose

Create a repository of "when we expect to pay vendors" that drives 14-week forward cash projections.

---

## Core Principles

1. **Rules are templates** - Define recurring payment patterns
2. **Manual creation only** - No auto-generation from actuals
3. **Amount is fixed** - User enters expected amount (no median calculation)
4. **Active/inactive toggle** - Temporarily disable without deleting
5. **Prospective only** - Rules generate future dates, never back-fill
6. **Business day aware** - Respect weekends and holidays

---

## Rule Definition

Each payment rule consists of:

### 1. Vendor Name
- Free-text input (no master vendor list)
- Examples: "Payroll Services Inc", "Amazon Web Services", "City Office Properties"

### 2. Category
- Dropdown: Labor, COGS, Opex, Other
- Used for forecast grouping only
- No subcategory/subtype (that's for actuals via verification)

### 3. Amount
- Manual numeric input (e.g., $32,500)
- Fixed per occurrence
- User updates manually if amounts change

### 4. Frequency
- **weekly** - Every N weeks on specific day_of_week
- **semimonthly** - 1st and 15th of every month
- **monthly** - Specific day_of_month each month
- **quarterly** - Every 3 months on specific day
- **annual** - Once per year on specific date

### 5. Anchor Day
Depends on frequency:
- **Weekly**: day_of_week (0=Sun, 1=Mon, ..., 6=Sat)
- **Semimonthly**: Fixed at 1st and 15th
- **Monthly**: day_of_month (1-31 or "last_business_day")
- **Quarterly**: month_and_day (e.g., Jan 15, Apr 15, Jul 15, Oct 15)
- **Annual**: month_and_day (e.g., Feb 27)

### 6. Business Day Adjustment
- **next** - If anchor falls on weekend/holiday, move to next business day
- **previous** - Move to previous business day
- **none** - Use exact date regardless

### 7. Active Status
- Boolean toggle
- Inactive rules don't generate forecast transactions
- Allows temporary pause without deletion

---

## Frequency Examples

### Weekly: Payroll
- Frequency: weekly
- Anchor: day_of_week = 5 (Friday)
- Amount: $32,500
- Business Day: next
→ Generates: Every Friday, or next Monday if Friday is holiday

### Semimonthly: Rent Payment
- Frequency: semimonthly
- Anchor: (auto: 1st and 15th)
- Amount: $8,400
- Business Day: previous
→ Generates: 1st and 15th of each month, adjusted backward if weekend

### Monthly: AWS Billing
- Frequency: monthly
- Anchor: day_of_month = 1
- Amount: $2,850
- Business Day: next
→ Generates: 1st of each month, adjusted forward if weekend

### Quarterly: Software License
- Frequency: quarterly
- Anchor: Jan 15, Apr 15, Jul 15, Oct 15
- Amount: $15,600
- Business Day: none
→ Generates: Exact dates, no adjustment

### Annual: Insurance Premium
- Frequency: annual
- Anchor: Feb 27
- Amount: $25,200
- Business Day: next
→ Generates: Feb 27 each year, adjusted forward if weekend

---

## Holiday Calendar

**Table**: `holidays`

**Columns**:
- `date` (DATE PRIMARY KEY)
- `name` (TEXT) - e.g., "New Year's Day", "Thanksgiving"
- `is_observed` (BOOLEAN) - false for optional holidays

**Usage**:
- Business day adjustment checks `holidays` table
- If anchor date IN (SELECT date FROM holidays WHERE is_observed = true), apply adjustment

**Bootstrap Data**:
- US Federal Holidays (10 days/year)
- New Year's Day, MLK Day, Presidents Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, Day After Thanksgiving, Christmas Eve, Christmas Day

---

## Database Schema

**Table**: `payment_rules`

```sql
CREATE TABLE payment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Labor' | 'COGS' | 'Opex' | 'Other'
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL, -- 'weekly' | 'semimonthly' | 'monthly' | 'quarterly' | 'annual'

  -- Anchor day (varies by frequency)
  day_of_week INT, -- 0-6 for weekly
  day_of_month INT, -- 1-31 or -1 for last_business_day (monthly)
  quarterly_schedule JSONB, -- [{month:1,day:15}, {month:4,day:15}...] for quarterly
  annual_month INT, -- 1-12 for annual
  annual_day INT, -- 1-31 for annual

  business_day_adjustment TEXT DEFAULT 'next', -- 'next' | 'previous' | 'none'
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMP,
  updated_by TEXT
);
```

**Table**: `holidays`

```sql
CREATE TABLE holidays (
  date DATE PRIMARY KEY,
  name TEXT NOT NULL,
  is_observed BOOLEAN DEFAULT true
);
```

---

## UI Flow

### Bootstrap Phase: Empty State
1. User lands on `/rules` page
2. Sees: "No payment rules yet. Create your first recurring payment."
3. Clicks: "Create Rule" button
4. Modal/drawer opens with form

### Create Rule Form
Fields:
1. Vendor (text input)
2. Category (dropdown: Labor, COGS, Opex, Other)
3. Amount (numeric $ input)
4. Frequency (dropdown: weekly, semimonthly, monthly, quarterly, annual)
5. Anchor Day (dynamic based on frequency selection)
6. Business Day Adjustment (dropdown: next, previous, none)
7. Active (toggle, default ON)

Buttons:
- "Cancel" - Close without saving
- "Save & Regenerate" - Save rule + trigger forecast regeneration

### Rules Table View
Columns:
- Vendor (sortable)
- Category (sortable, filterable)
- Frequency (sortable)
- Amount (sortable, right-aligned)
- Active (toggle)
- Actions (Edit, Delete buttons)

Stats Sidebar:
- Total Active Rules: 12
- Monthly Forecast: $184,750
- Labor Rules: 2
- COGS Rules: 4
- Opex Rules: 6

---

## Design System

**Visual Style**: Forest green theme matching other pages
- Header: `linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 40%, #3d6b3d 100%)`
- Stat cards: 3px top gradient bar, glassmorphic blur
- Table: Excel-like density, sticky header, forest green hover
- Buttons: Primary = forest green gradient, Edit = orange, Delete = red

**Modal/Drawer**:
- Glassmorphic background with blur
- Form inputs: Forest green focus border
- Validation: Red error messages below fields

---

## Workflow Boundaries

### ✅ This Page DOES:
- Create/edit/delete payment rules
- Define vendor payment schedules
- Store rule templates
- Manage holiday calendar
- Toggle rules active/inactive

### ❌ This Page DOES NOT:
- Generate forecast transactions (forecast engine does this)
- Auto-calculate amounts from actuals (manual entry only)
- Match rules to incoming transactions (verification does this)
- Show "vendors without rules" (that's actuals, not rules)
- Display variance (actuals vs rules)
- Import rules from CSV (manual entry only for Solo MVP)

---

## Handoff to Forecast Engine

When "Regenerate Forecast" is clicked:
1. Payment Rules page saves all rules
2. Calls: `POST /api/forecast/regenerate`
3. Forecast engine:
   - Deletes all `forecast_transactions`
   - Reads all `payment_rules WHERE is_active = true`
   - For each rule, generates 14 weeks of occurrences
   - Inserts into `forecast_transactions`
4. Forecast page refreshes with new projections

---

## Success Criteria

- Create 20+ rules in <10 minutes (spreadsheet-like speed)
- Edit rule updates forecast within 2 seconds
- Business day logic skips weekends/holidays correctly
- Inactive rules don't appear in forecast
- Holiday calendar pre-populated with US federal holidays
