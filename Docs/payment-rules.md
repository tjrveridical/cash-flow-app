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
7. **User Workflows** - the workflow

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


## User Workflows

### Create Rule Workflow

**Trigger**: User clicks "Create Rule" button in header or "Create Your First Rule" in empty state

**Steps**:

1. **Modal Opens** with empty form and rule name preview showing "—"

2. **Select Frequency** (required dropdown)
   - Options: Weekly, SemiMonthly, Monthly, Quarterly, SemiAnnual, Annually
   - Form fields dynamically show/hide based on selection

3. **Fill Frequency-Specific Fields**:

   **If Weekly**:
   - Day of Week: Dropdown (Sun-Sat)
   - Rule name updates: `Weekly_Mon`

   **If Monthly**:
   - Day of Month: Number input (1-31) OR
   - "End of Month" checkbox
   - If EOM checked: Rule name = `Monthly_EOM`, Adj forced to "Previous"
   - Else: Rule name = `Monthly_15`

   **If SemiMonthly**:
   - 1st Day: Number input (1-31)
   - 2nd Day: Number input (1-31)
   - Rule name = `SemiMonthly_5_17`

   **If Quarterly**:
   - Anchor Day: Number input (1-31)
   - Starting Month: Dropdown (Jan-Dec)
   - System auto-generates quarter pattern
   - Rule name = `Quarterly_15_Mar` (implies 3,6,9,12)

   **If SemiAnnual**:
   - 1st Day: Number input (1-31)
   - 1st Month: Dropdown (Jan-Dec)
   - 2nd Day: Number input (1-31)
   - 2nd Month: Dropdown (Jan-Dec)
   - Rule name = `SemiAnnual_30Apr_31Oct`

   **If Annually**:
   - Anchor Day: Number input (1-31)
   - Month: Dropdown (Jan-Dec)
   - Rule name = `Annually_27_Feb`

4. **Select Business Day Adjustment** (required dropdown)
   - "Next Business Day" (default for most)
   - "Previous Business Day" (required for EOM, optional for others)

5. **Real-Time Rule Name Preview**
   - Updates as user fills fields
   - Format follows pattern: `Frequency_Anchor` or `Frequency_Anchor_Month`
   - Displays at top of modal in large green box

6. **Validation**
   - All required fields filled: Rule name no longer ends with "_"
   - Duplicate check: If rule name already exists, red error shows below form
   - Anchor day range: Must be 1-31

7. **Save Template**
   - Click "Save Template" button (forest green, bottom right)
   - Modal closes
   - Green toast notification: "Rule saved successfully!" (3 seconds)
   - Table refreshes with new rule sorted by frequency
   - Stats sidebar updates counts

**Result**: New paydate rule created and available for forecast items to reference

---

### Edit Rule Workflow

**Trigger**: User clicks "Edit" button on any rule row

**Steps**:

1. **Modal Opens** pre-filled with existing rule data
   - Modal title: "Edit Paydate Rule"
   - All fields populated with current values
   - Rule name preview shows current name

2. **Modify Fields**
   - User can change any field except frequency (frequency change = new rule)
   - Rule name preview updates in real-time
   - Validation runs on changes

3. **Save Changes**
   - Click "Save Template"
   - **Warning Modal**: "This rule is referenced by 12 forecast items. Updating will trigger forecast regeneration. Continue?"
   - User confirms or cancels

4. **On Confirm**:
   - Rule updated in database
   - All forecast items referencing this rule remain linked (by rule_name)
   - Forecast regeneration queued (manual trigger from /forecast page)
   - Toast: "Rule updated. Regenerate forecast to apply changes."

**Result**: Rule modified, forecast items need regeneration to reflect changes

---

### Delete Rule Workflow

**Trigger**: User clicks "Del" button on any rule row

**Steps**:

1. **Confirmation Dialog**
   - Browser confirm: "Delete Monthly_15? This will affect 8 forecast items."
   - Count shows number of forecast_items referencing this rule

2. **User Confirms**
   - Rule deleted from `payment_rules` table
   - Forecast items referencing this rule are NOT deleted
   - Foreign key constraint: forecast_items.rule_name becomes invalid reference
   - System flags affected forecast items with warning state

3. **Post-Delete**
   - Table refreshes without deleted rule
   - Stats sidebar updates counts
   - Toast: "Monthly_15 deleted. Review affected forecast items."

4. **Orphaned Forecast Items**
   - On /forecast-items page, affected items show warning badge
   - CFO must reassign to different rule or delete forecast items
   - Cannot regenerate forecast until orphans resolved

**Result**: Rule removed, dependent forecast items require attention

---

### Understanding Auto-Generated Rule Names

Rule names follow strict format patterns for consistency and clarity:

**Format Patterns**:
- **Weekly**: `Weekly_[Day]` → `Weekly_Mon`, `Weekly_Fri`
- **SemiMonthly**: `SemiMonthly_[Day1]_[Day2]` → `SemiMonthly_5_17`
- **Monthly**: `Monthly_[Day]` → `Monthly_01`, `Monthly_15`, `Monthly_EOM`
- **Quarterly**: `Quarterly_[Day]_[Month]` → `Quarterly_15_Mar` (implies 3,6,9,12)
- **SemiAnnual**: `SemiAnnual_[Day1][Month1]_[Day2][Month2]` → `SemiAnnual_30Apr_31Oct`
- **Annually**: `Annually_[Day]_[Month]` → `Annually_27_Feb`

**Why Names Matter**:
- Rule names are **references** used by forecast items
- Each forecast item links to exactly one paydate rule
- Changing a rule name breaks existing references
- Deleting a rule orphans dependent forecast items

**Naming Rules**:
- Must be unique across all rules
- Auto-generated from frequency + anchors + months
- Cannot be manually edited (ensures consistency)
- Follow deterministic pattern (same inputs = same name)

---

### Business Day Adjustment Logic

When a calculated payment date falls on a **weekend** or **US Federal Holiday**, the system adjusts to the nearest business day.

**Holiday Calendar**:
- Stored in `holidays` table
- Pre-seeded with 10 US Federal Holidays annually
- Recurring holidays auto-calculated (e.g., Memorial Day = last Monday in May)
- CFO can add custom holidays (company closures, international holidays)

**Adjustment Options**:

**Next Business Day** (most common):
- If payment date = Saturday → Move to Monday
- If payment date = Sunday → Move to Monday
- If payment date = Holiday Monday → Move to Tuesday
- Example: Monthly_15 falls on Sat Dec 15 → Moves to Mon Dec 17

**Previous Business Day** (used for EOM):
- If payment date = Saturday → Move to Friday
- If payment date = Sunday → Move to Friday
- If payment date = Holiday Friday → Move to Thursday
- Example: Monthly_EOM falls on Sat Feb 28 → Moves to Fri Feb 27
- **Required** for Monthly_EOM to avoid rolling into next month

**When to Use Each**:
- **Next**: Default for most payments (rent, subscriptions, services)
- **Previous**: End-of-month payments, month-end accounting, avoid date rollover

**Edge Cases**:
- Multi-day holidays (e.g., Christmas + Day After): Adjusts to first business day
- Year-end holidays: Dec 31 (Fri) + Jan 1 (Mon) → Next business day is Jan 2 (Tue)
- EOM in February: Feb 28/29 always Previous to stay in February

---

## Bootstrap Rules (Auto-Seeded)

The following 25 paydate rules are automatically seeded during initial database setup. These represent the production rules currently in use:

**Annual Rules (5)**:
- Annually_01_Jun
- Annually_02_Feb
- Annually_20_Oct
- Annually_23_May
- Annually_27_Feb

**Monthly Rules (15)**:
- Monthly_01, Monthly_02, Monthly_05, Monthly_07, Monthly_08
- Monthly_11, Monthly_15, Monthly_17, Monthly_18, Monthly_20
- Monthly_21, Monthly_23, Monthly_29, Monthly_30, Monthly_EOM

**Quarterly Rules (2)**:
- Quarterly_01_Jan (1,4,7,10)
- Quarterly_15_Mar (3,6,9,12)

**SemiAnnual Rules (1)**:
- SemiAnnual_30Apr_31Oct (4,10)

**SemiMonthly Rules (1)**:
- SemiMonthly_5_17

**Weekly Rules (1)**:
- Weekly_Mon

These rules are created during the initial migration and are immediately available for forecast items to reference. Users can create additional rules as needed following the Create Rule Workflow above.

---

## UI Routes

- **Primary**: `/paydate-rules` - Main template library interface
- **Related**: `/forecast-items` - Where these rules get referenced

## API Endpoints

- `GET /api/paydate-rules` - List all rules
- `POST /api/paydate-rules` - Create new rule
- `PUT /api/paydate-rules/:id` - Update existing rule
- `DELETE /api/paydate-rules/:id` - Delete rule (with dependency check)
- `GET /api/paydate-rules/:id/dependencies` - Count forecast items using this rule

## State Management

**Table Sorting**:
- Default: Sorted by frequency (Annual → Weekly)
- Click column header to sort by that column
- Arrow indicator shows sort direction

**Empty State**:
- Shows when zero rules exist (should never happen after bootstrap)
- Large centered card with calendar icon
- "Create Your First Rule" button

**Populated State** (default):
- Table shows all rules with frequency badges
- Color-coded by frequency type
- Stats sidebar shows counts by frequency

## Success Criteria

✅ User can create new paydate rule in <30 seconds
✅ Rule name auto-generates correctly for all frequency types
✅ Duplicate validation prevents conflicting names
✅ Edit workflow warns about forecast impact
✅ Delete workflow prevents orphaned forecast items
✅ Business day logic handles holidays correctly
✅ 25 bootstrap rules available immediately after setup