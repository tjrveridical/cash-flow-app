# Forecast Engine Specification

The forecast engine generates a 14-week forward-looking cash projection by combining verified actuals, payment rule projections, and AR estimates.

---

## Purpose

Produce a rolling 14-week cash forecast that answers: "How much cash will we have on any given week?"

---

## Core Principles

1. **Actuals take precedence** - Real verified transactions override projections
2. **14-week rolling window** - Always shows current week + 13 forward
3. **Week boundaries** - Sunday to Saturday (ISO week standard)
4. **Business day aware** - Payment rules respect holidays/weekends
5. **Regenerate on demand** - Manual trigger, not automatic

---

## Inputs

### 1. Verified Actuals (Historical)
**Source**: `classified_bank_transactions WHERE is_verified = true`

**Used For**:
- Past weeks (actual cash movements)
- Current week partial actuals

**Grouping**: Sum by category + week

---

### 2. Payment Rule Projections (Future)
**Source**: `payment_rules` table

**Generated**: On-demand via "Regenerate Forecast" button

**Logic**:
- For each active rule:
  - Calculate next N occurrences (14 weeks forward)
  - Apply frequency (weekly/monthly/quarterly/annual)
  - Apply anchor day (day_of_week, day_of_month, etc.)
  - Apply business_day_adjustment (next/previous/none)
  - Check against `holidays` table
  - Generate synthetic transaction with amount

**Output**: `forecast_transactions` table

---

### 3. AR Estimates (Future)
**Source**: `ar_forecast` table

**Used For**: Cash inflows from expected customer payments

**Logic**:
- Manual CFO inputs (customer, invoice, amount, date, confidence)
- Confidence weighting (High 90%, Medium 70%, Low 50%)
- Grouped by week

---

## Output

### Forecast Spreadsheet View (14 columns)

**Rows**:
- Beginning Cash (starting balance)
- **CASH INFLOWS** section
  - AR Collections (from ar_forecast)
  - Other Revenue
  - Total Inflows
- **LABOR** section (from payment_rules + actuals)
  - Payroll
  - Benefits & Taxes
- **COGS** section (from payment_rules + actuals)
  - Hardware
  - Software
- **OPEX** section (from payment_rules + actuals)
  - Rent
  - Insurance
  - Utilities
  - IT Services
- Total Outflows
- Net Cash Flow
- Ending Cash

**Visual Distinction**:
- Actuals: Black, bold font-weight 700
- Forecasts: Blue italic, font-weight 500

---

## Calculation Logic

### For Each Week (Sunday to Saturday):

1. **Beginning Cash** = Previous week's ending cash

2. **Actuals (past/current weeks)**:
   - Query verified transactions WHERE date IN week_range
   - Sum by display_label (AR Collections, Payroll, etc.)
   - Display in black/bold

3. **Forecasts (future weeks)**:
   - Query forecast_transactions WHERE date IN week_range
   - Sum by category
   - Display in blue/italic

4. **AR Estimates**:
   - Query ar_forecast WHERE expected_date IN week_range
   - Apply confidence weighting
   - Sum by week
   - Display in blue/italic

5. **Total Inflows** = Sum of all positive amounts

6. **Total Outflows** = Sum of all negative amounts

7. **Net Cash Flow** = Total Inflows + Total Outflows

8. **Ending Cash** = Beginning Cash + Net Cash Flow

---

## Database Schema

**Tables Used**:
- `classified_bank_transactions` (verified actuals)
- `forecast_transactions` (rule projections)
- `ar_forecast` (AR estimates)
- `payment_rules` (rule definitions)
- `holidays` (business day logic)

**Key Schema**:
```sql
forecast_transactions:
  - id UUID PRIMARY KEY
  - rule_id UUID REFERENCES payment_rules
  - date DATE NOT NULL
  - vendor TEXT NOT NULL
  - amount NUMERIC NOT NULL
  - category_code TEXT
  - generated_at TIMESTAMP DEFAULT NOW()

Lifecycle:
  - Created: When "Regenerate Forecast" is clicked
  - Deleted: All rows deleted before regeneration
  - Never edited: Always fresh from rules
```

---

## Regeneration Process

### Trigger
- Manual button: "Regenerate Forecast" on /rules page
- Or: "Regenerate" button on /forecast page header

### Steps
1. `DELETE FROM forecast_transactions` (clear all projections)
2. FOR EACH payment_rule WHERE is_active = true:
   - Calculate occurrences for next 14 weeks
   - Apply frequency + anchor_day + business_day_adjustment
   - INSERT INTO forecast_transactions
3. Refresh forecast page view

### Performance
- Target: <2 seconds for 50 active rules
- 14 weeks × 50 rules = ~700 forecast rows generated

---

## UI Routes

- `/forecast` - Main forecast spreadsheet (14 columns)
- Clickable amounts open modal showing:
  - Payment rule details (for forecasts)
  - Transaction details (for actuals)
  - AR entry details (for AR estimates)

---

## Design System

**Visual Style**: Matches forecast-spreadsheet-redesigned.html
- Week header: `linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 100%)`
- Current week: Highlighted with blue bottom border
- Section headers: Forest green gradients (INFLOWS, LABOR, COGS, OPEX)
- Amount styling:
  - Positive: `color: #059669` (green)
  - Negative: `color: #dc2626` (red)
  - Actuals: `font-weight: 700, color: #0f172a` (black)
  - Forecasts: `color: #3b82f6, font-style: italic` (blue)

**Tooltips**:
- Hover on row labels shows description
- Hover on amounts shows source (rule/actual/AR)

---

## Workflow Boundaries

### ✅ This Engine DOES:
- Calculate 14-week rolling forecast
- Combine actuals + rule projections + AR estimates
- Apply business day adjustments
- Display in spreadsheet format
- Show visual distinction (actual vs forecast)

### ❌ This Engine DOES NOT:
- Create payment rules (handled by rules page)
- Verify transactions (handled by verification)
- Import CSVs (handled by ingestion)
- Estimate AR (handled by AR page)
- Store beginning cash (separate config)
- Calculate variance/budget vs actual (future feature)

---

## State Dependencies

**Upstream**:
- Verification Workflow (provides verified actuals)
- Payment Rules (provides rule definitions)
- AR Estimation (provides inflow projections)

**Downstream**:
- Forecast Dashboard (displays output)

---

## Success Criteria

- 14 weeks always visible
- Current week highlighted
- Actuals appear within 5 minutes of verification
- Forecast regenerates in <2 seconds
- Business days respected (weekends/holidays skipped)
- Ending cash rolls forward correctly
