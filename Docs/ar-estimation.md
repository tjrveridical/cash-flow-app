# AR Estimation Specification

AR estimation captures manual CFO predictions for customer payment timing to project cash inflows in the 14-week forecast.

---

## Purpose

Provide forward-looking visibility into "when customers will actually pay us" based on CFO judgment, invoice aging, and collection patterns.

---

## Core Principles

1. **Manual entry only** - No auto-calculation from aging reports (Solo MVP)
2. **4-week rolling window** - Focus on near-term collections
3. **Confidence weighting** - High/Medium/Low affects forecast amounts
4. **Customer + invoice tracking** - Not just amounts
5. **CFO judgment** - Based on payment history, relationship, invoice age

---

## AR Entry Definition

Each AR estimate consists of:

### 1. Customer Name
- Free-text input (no master customer list)
- Examples: "City Hospital", "Regional Medical", "Metro Health"

### 2. Invoice Number
- Text input (e.g., "#4421", "#INV-2024-108")
- Optional but recommended for tracking

### 3. Expected Amount
- Numeric $ input
- Gross amount (before confidence weighting)

### 4. Expected Date
- Date picker
- Which week CFO believes payment will arrive

### 5. Confidence Level
- **High (90%)** - Strong payment history, confirmed with AP, within terms
- **Medium (70%)** - Decent history, within 60 days, no red flags
- **Low (50%)** - New customer, past due, slow payer, collection risk

### 6. Collection Notes
- Optional textarea
- CFO can note: "45-day terms, pays on time", "Called AP, confirmed wire", "90 days overdue, sent to collections"

---

## Confidence Weighting

**Forecast Engine applies weighting**:
- High: 90% of entered amount
- Medium: 70% of entered amount
- Low: 50% of entered amount

**Example**:
- Invoice: $100,000
- Confidence: Medium (70%)
- Forecast shows: $70,000

**Rationale**: Conservative cash planning (under-promise, over-deliver)

---

## Database Schema

**Table**: `ar_forecast`

```sql
CREATE TABLE ar_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer TEXT NOT NULL,
  invoice_number TEXT,
  expected_amount NUMERIC NOT NULL,
  expected_date DATE NOT NULL,
  confidence TEXT NOT NULL, -- 'high' | 'medium' | 'low'
  collection_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMP,
  updated_by TEXT
);

CREATE INDEX idx_ar_forecast_date ON ar_forecast(expected_date);
```

---

## UI Flow

### Empty State
1. User lands on `/ar` page
2. Sees: "No AR estimates yet. Add your first expected payment."
3. Summary cards show:
   - 4-Week AR Forecast: $0
   - This Week Expected: $0
   - Forecast Accuracy: N/A
   - Outstanding AR: $0 (future: pull from QBO)

### Add AR Entry
1. Click "Add New Entry" button (forest green, top right)
2. Modal opens with form:
   - Customer (text input)
   - Invoice Number (text input, optional)
   - Expected Amount ($ input)
   - Expected Date (date picker, limited to next 4 weeks)
   - Confidence Level (dropdown: High/Medium/Low)
   - Collection Notes (textarea, optional)
3. Click "Save" - adds to list
4. Forecast auto-refreshes with new AR projection

### AR Table View

**Columns**:
- Week (grouped: Week of Nov 18, Week of Nov 25, etc.)
- Customer (sortable)
- Invoice (monospace font)
- Amount (right-aligned, green)
- Confidence (badge: High=green, Medium=orange, Low=gray)
- Expected Date
- Actions (Edit, Delete)

**Visual Grouping**:
- Group by week with week header rows
- Show week totals
- Sort by date within week

---

## 4-Week Limitation

**Why 4 weeks?**
- CFO has reasonable visibility 4 weeks out
- Beyond 4 weeks, too much uncertainty
- Matches typical AP payment cycles (Net 30-45)

**Enforcement**:
- Date picker disabled for dates >4 weeks from today
- API validation rejects expected_date >28 days from now

**Rolling Window**:
- Each Monday, week 5 becomes available
- Old estimates (>4 weeks past) archived automatically

---

## Forecast Integration

### In Forecast Spreadsheet

**Row**: "AR Collections" under CASH INFLOWS section

**Calculation** (per week):
```sql
SELECT
  EXTRACT(WEEK FROM expected_date) as week,
  SUM(
    expected_amount *
    CASE confidence
      WHEN 'high' THEN 0.90
      WHEN 'medium' THEN 0.70
      WHEN 'low' THEN 0.50
    END
  ) as weighted_ar
FROM ar_forecast
WHERE expected_date >= [week_start]
  AND expected_date <= [week_end]
GROUP BY week;
```

**Visual Style**:
- Blue italic (forecast, not actual)
- Clickable - opens modal showing:
  - Which customers included
  - Individual amounts
  - Confidence levels

---

## Future Enhancement (Post-MVP)

**Not in Solo MVP**:
- Auto-import from QBO AR Aging Report
- Historical accuracy tracking (forecast vs actual)
- Customer payment pattern analysis
- Variance alerts (customer paid early/late)
- Integration with sales pipeline (convert opportunities to AR)

**For Now**:
- 100% manual CFO entry
- Focus on next 4 weeks only
- Simple confidence weighting

---

## Design System

**Visual Style**: Forest green theme matching other pages
- Header: Forest green gradient
- Summary cards: 4 cards across (4-week forecast, this week, accuracy, outstanding)
- Table: Excel-like with week groupings
- Confidence badges:
  - High: Green gradient `#059669`
  - Medium: Orange gradient `#f59e0b`
  - Low: Gray gradient `#6b7280`

**Modal**:
- Glassmorphic blur background
- Forest green "Save" button
- Date picker with forest green highlight
- Textarea for notes with character count

---

## Workflow Boundaries

### ✅ This Page DOES:
- Capture CFO payment predictions
- Store 4-week AR estimates
- Apply confidence weighting
- Feed forecast engine with inflow data
- Track customer + invoice details

### ❌ This Page DOES NOT:
- Pull from QBO AR Aging (future feature)
- Auto-calculate payment timing (manual only)
- Track actual payments (that's verification workflow)
- Generate invoices (that's QBO)
- Calculate variance (future feature)
- Show aging buckets (future feature)

---

## Handoff to Forecast Engine

When AR entry is saved:
1. INSERT INTO ar_forecast
2. Forecast engine queries ar_forecast for date ranges
3. Applies confidence weighting
4. Sums by week
5. Displays in "AR Collections" row as blue/italic

No regeneration needed - AR entries query on page load.

---

## Success Criteria

- Add 10 AR entries in <5 minutes
- Date picker enforces 4-week limit
- Confidence weighting visible in forecast (90%/70%/50%)
- Edit entry updates forecast immediately
- Week grouping clear and scannable
- Forecast shows weighted amounts, not gross
