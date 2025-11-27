# 8. AR Estimation Module (Step 1: Solo MVP)

**⚠️ V1 SIMPLIFIED IMPLEMENTATION**

This module describes the original complex design with invoice-level tracking. The actual V1 implementation uses a simplified week-level approach:

**V1 (Implemented):**
- Spreadsheet-style horizontal scrolling grid
- Week-level totals only (no invoice detail)
- Simple inline editing (click cell → type amount → save)
- Table: `ar_forecast` (week_ending, forecasted_amount, notes)

**V2 (Original Design - Deferred):**
- Invoice-level detail tracking
- Customer names and invoice numbers
- Confidence level weighting
- Modal forms for entry
- Table: `ar_forecast_entries` (complex version)

See implementation files:
- Database: `supabase/migrations/20251127134853_create_ar_forecast.sql`
- API: `app/api/ar-forecast/route.ts`
- UI: `app/ar-forecast/page.tsx`
- Integration: `lib/forecast/forecast-service.ts`

---

## Purpose & Scope (Original V2 Design)

The AR Estimation Module provides manual 4-week rolling AR forecast capabilities, allowing CFOs to input expected customer payments with confidence levels. These forecasts populate "AR Collections" inflows in future forecast weeks with conservative confidence-weighted amounts.

## Human Workflow 👤

### Enter AR Forecast

1. **Navigate to AR Forecast Page** (`/app/ar-forecast`)
   - Page displays 4-week glassmorphic table
   - Forest green design matching verification inbox
   - Column headers show week-ending dates

2. **Add New AR Entry**
   - Click "Add Entry" button
   - Modal opens with form fields

3. **Fill Entry Details**
   - **Customer Name:** "Community Hospital - East Wing"
   - **Invoice Number:** Optional reference
   - **Expected Amount:** Dollar value
   - **Expected Payment Date:** Specific date or week selector
   - **Confidence Level:** High (90%), Medium (70%), Low (40%)
   - **Notes:** "Pending approval", "Payment plan", etc.

4. **Review Confidence-Weighted Amount**
   - System calculates: `expected_amount × confidence_multiplier`
   - High: $10,000 × 0.9 = $9,000
   - Medium: $10,000 × 0.7 = $7,000
   - Low: $10,000 × 0.4 = $4,000

5. **Save Entry**
   - Entry added to table
   - Totals per week updated
   - Forecast grid reflects new AR Collections

### Edit AR Entry

1. **Click "Edit" Button** on table row
   - Modal opens pre-populated with entry data

2. **Modify Fields**
   - Change amount, date, confidence level, or notes

3. **Save Changes**
   - Entry updated in database
   - Forecast totals recalculated

### Delete AR Entry

1. **Click "Delete" Button** on table row
   - Confirm deletion

2. **Entry Removed**
   - Totals per week updated
   - Forecast grid reflects removal

### Edge Cases

- **Past Dates:** Warning if entering AR entry for past week
- **Multiple Entries Same Customer:** Allowed (multiple invoices)
- **Zero Amount:** Validation prevents saving
- **Confidence Level Change:** Immediately recalculates weighted amount

## Database Schema

### ar_forecast_entries Table

See [01-database-schema.md](01-database-schema.md#ar_forecast_entries-table) for complete schema.

**Key Fields:**
- `customer_name` - Customer/client name
- `invoice_number` - Optional invoice reference
- `expected_amount` - Dollar value (unweighted)
- `expected_date` - Specific payment date
- `confidence_level` - 'high', 'medium', 'low'
- `confidence_multiplier` - 1.0, 0.9, 0.7, or 0.4
- `notes` - Optional context
- `created_by` - User who created entry

## API Endpoints

### GET /api/ar-forecast

Fetches all AR forecast entries.

**Query Parameters:**
- `startDate` (optional) - Filter entries >= startDate
- `endDate` (optional) - Filter entries <= endDate

**Response:**
```json
{
  "success": true,
  "entries": [
    {
      "id": "uuid",
      "customer_name": "Community Hospital - East Wing",
      "invoice_number": "INV-2024-123",
      "expected_amount": 10000.00,
      "expected_date": "2024-11-20",
      "confidence_level": "high",
      "confidence_multiplier": 0.9,
      "notes": "Pending approval",
      "created_by": "uuid",
      "created_at": "2024-11-27T10:00:00Z",
      "updated_at": "2024-11-27T10:00:00Z"
    }
  ],
  "total_expected": 25000.00,
  "total_weighted": 19500.00
}
```

### POST /api/ar-forecast

Creates new AR forecast entry.

**Request:**
```json
{
  "customer_name": "Community Hospital - East Wing",
  "invoice_number": "INV-2024-123",
  "expected_amount": 10000.00,
  "expected_date": "2024-11-20",
  "confidence_level": "high",
  "notes": "Pending approval"
}
```

**Validation:**
- Required fields: customer_name, expected_amount, expected_date, confidence_level
- confidence_level must be 'high', 'medium', or 'low'
- expected_amount must be positive

**Response:**
```json
{
  "success": true,
  "entry": { /* created entry */ }
}
```

### PUT /api/ar-forecast/[id]

Updates existing AR forecast entry.

**Request:** Same as POST

**Validation:** Same as POST, plus check for entry existence

**Response:**
```json
{
  "success": true,
  "entry": { /* updated entry */ }
}
```

### DELETE /api/ar-forecast/[id]

Deletes AR forecast entry.

**Response:**
```json
{
  "success": true,
  "message": "AR forecast entry deleted successfully"
}
```

## UI Components

### /app/ar-forecast/page.tsx

Main AR forecast page.

**Layout:**
- **Header:** Forest green gradient title, "Add Entry" button
- **4-Week Table:** Glassmorphic with week columns
- **Stats Sidebar:** Total expected, total weighted, entry count
- **Color-Coded Confidence:** High = green, Medium = yellow, Low = red

**Table Structure:**
```
| Customer         | Invoice   | Amount   | Week 1 | Week 2 | Week 3 | Week 4 | Confidence | Actions |
|------------------|-----------|----------|--------|--------|--------|--------|------------|---------|
| Hospital - East  | INV-123   | $10,000  | $9,000 |        |        |        | High (90%) | Edit Del|
| Clinic - North   | INV-124   | $5,000   |        | $3,500 |        |        | Med (70%)  | Edit Del|
| TOTALS           |           |          | $9,000 | $3,500 | $0     | $0     |            |         |
```

**Confidence Chips:**
- **High:** Green background (`bg-green-50 text-green-700`)
- **Medium:** Yellow background (`bg-yellow-50 text-yellow-700`)
- **Low:** Red background (`bg-red-50 text-red-700`)

### Modal Form (Create/Edit)

**Form Fields:**
- Customer Name (text input)
- Invoice Number (optional text input)
- Expected Amount (currency input with $)
- Expected Payment Date (date picker)
- Confidence Level (dropdown: High, Medium, Low)
- Notes (textarea)

**Real-Time Preview:**
- Shows weighted amount as user selects confidence level
- Example: "Expected: $10,000 → Weighted: $9,000 (90%)"

## Implementation Details

### Confidence Multipliers

**Algorithm:**
```typescript
function getConfidenceMultiplier(level: 'high' | 'medium' | 'low'): number {
  switch (level) {
    case 'high':
      return 0.9;  // 90% confidence
    case 'medium':
      return 0.7;  // 70% confidence
    case 'low':
      return 0.4;  // 40% confidence
    default:
      return 1.0;
  }
}

function calculateWeightedAmount(expectedAmount: number, confidenceLevel: string): number {
  const multiplier = getConfidenceMultiplier(confidenceLevel);
  return expectedAmount * multiplier;
}
```

**Rationale:** Conservative forecasting; avoid over-projecting runway. Better to under-estimate collections than over-estimate.

### Forecast Integration

**Merge AR forecast with actual collections:**

```typescript
async function getARCollections(weekEnding: Date): Promise<number> {
  // Check if week is in the past (historical)
  const lastTransactionDate = await getLastTransactionDate();

  if (weekEnding <= lastTransactionDate) {
    // Historical: Use actual AR Collections from classified_bank_transactions
    return getActualARCollections(weekEnding);
  } else {
    // Future: Use sum of weighted AR forecast entries for that week
    const entries = await supabase
      .from('ar_forecast_entries')
      .select('expected_amount, confidence_multiplier')
      .gte('expected_date', weekStartDate)
      .lte('expected_date', weekEnding);

    return entries.reduce((sum, entry) => {
      return sum + (entry.expected_amount * entry.confidence_multiplier);
    }, 0);
  }
}
```

### Visual Distinction in Forecast Grid

**Forecast grid styling for AR estimates:**
- Font-weight 400 (vs 600 for actuals)
- Opacity 0.7 (vs 1.0 for actuals)
- Italicized text
- DetailModal: Show "Projected from AR Forecast: [Customer] - [Invoice]" with confidence chip

**Example:**
```typescript
function getCellStyle(value: number, isActual: boolean) {
  return {
    fontWeight: isActual ? 600 : 400,
    opacity: isActual ? 1.0 : 0.7,
    fontStyle: isActual ? 'normal' : 'italic',
    color: value > 0 ? '#059669' : '#dc2626'
  };
}
```

### Weekly Aggregation

**Group AR entries by week-ending date:**

```typescript
function aggregateARByWeek(entries: ARForecastEntry[]): Map<string, number> {
  const weeklyTotals = new Map<string, number>();

  for (const entry of entries) {
    const weekEnding = getWeekEnding(entry.expected_date);
    const weightedAmount = entry.expected_amount * entry.confidence_multiplier;

    const current = weeklyTotals.get(weekEnding) || 0;
    weeklyTotals.set(weekEnding, current + weightedAmount);
  }

  return weeklyTotals;
}

function getWeekEnding(date: Date): string {
  // Find next Sunday from date
  const dayOfWeek = date.getDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const sunday = new Date(date);
  sunday.setDate(sunday.getDate() + daysUntilSunday);
  return sunday.toISOString().split('T')[0];
}
```

## Completion Criteria

**V1 Simplified Implementation:**
✅ ar_forecast table created (week_ending, forecasted_amount, notes)
✅ API endpoints implemented (GET, POST upsert, DELETE)
✅ AR forecast UI page with horizontal scrolling week grid
✅ Inline editing (click cell → type amount → Enter to save)
✅ Weekly aggregation logic (built-in via table structure)
✅ Forecast integration with forecast API (lib/forecast/forecast-service.ts)
✅ Visual distinction in forecast grid (actual bold, forecast italic blue)
✅ Forest green design matching other pages
✅ Summary stats (Total Actual, Total Forecast, Weeks Forecasted)
✅ Auto-scroll to current week on page load

**V2 Complex Implementation (Deferred):**
❌ ar_forecast_entries table with invoice-level detail
❌ Customer names and invoice numbers
❌ Modal form with confidence level selector
❌ Confidence multiplier calculation (90%, 70%, 40%)
❌ Invoice-level tracking and aggregation

## Related Modules

- [01-database-schema.md](01-database-schema.md) - ar_forecast_entries table schema
- [05-forecast-engine.md](05-forecast-engine.md) - Consumes AR forecasts for future weeks
- [06-forecast-dashboard.md](06-forecast-dashboard.md) - Displays AR Collections with forecasts
- [09-multi-user.md](09-multi-user.md) - Real created_by from auth session

---

## Additional Solo MVP Polish Tasks

### CSV Import Redesign (Section 8.6)

Polish existing `/app/import` page:
- Replace generic styling with forest green theme
- Glassmorphic file upload card matching other pages
- Progress indicators with forest green color scheme
- Error messages in red toast notifications (not inline text)
- Success summary in green toast notification
- Validation warnings displayed in amber chips

### Database Cleanup Audit (Section 8.7)

Schema hygiene before multi-user rollout:
- [ ] Remove unused columns from all tables
- [ ] Document all foreign key relationships
- [ ] Add missing indexes (e.g., `category_code`, `is_verified`, `date`)
- [ ] Update column comments for clarity
- [ ] Create database diagram (dbdiagram.io or similar)
- [ ] Export clean schema.sql for version control

### Error Toasts & Loading Spinners (Section 8.8)

Consistent UI feedback patterns:
- **Toast library:** `react-hot-toast` or `sonner`
- **Loading states:** Skeleton loaders for tables, spinners for buttons
- **Error handling:** API errors → red toast, success → green toast
- **Forest green toast theme:** Match button/header gradients
- Apply to: Import, Verification, Forecast, AR Forecast, Payment Rules

### "Set Beginning Cash" Modal (Section 8.9)

Implement stub button in forecast header:
- Modal with glassmorphic design
- Input fields: Bank account dropdown, As-of date picker, Balance amount
- Inserts into `cash_balances` table
- Updates "Beginning Cash" row in forecast grid
- Validation: Prevent duplicate entries for same account/date combination
- Use existing `cash_balances` table schema (Section 5.1)

## Related Modules

- [06-forecast-dashboard.md](06-forecast-dashboard.md) - Set Beginning Cash modal location
- [02-data-ingestion.md](02-data-ingestion.md) - CSV Import redesign
