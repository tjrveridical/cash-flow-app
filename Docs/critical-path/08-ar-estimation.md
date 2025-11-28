# 8. AR Estimation Module (Solo MVP)

## Purpose & Scope

The AR Estimation Module provides manual AR forecast capabilities, allowing CFOs to project expected customer payments on a weekly basis. These forecasts populate "AR Collections" inflows in future forecast weeks.

## Human Workflow 👤

### Enter AR Forecast

1. **Navigate to Main Forecast Page** (`/app/forecast`)
   - Future weeks in AR Collections row show italic blue amounts (forecast)
   - Past weeks show bold black amounts (actuals)

2. **Edit Future AR Collections**
   - Click any future week cell in AR Collections row
   - Cell becomes editable input field
   - Type expected collection amount for that week
   - Press Enter or click elsewhere to save

3. **View Updated Forecast**
   - Ending Cash immediately reflects new AR projection
   - Saved amount persists across page reloads
   - Visual distinction maintained (italic blue = forecast)

### Edit AR Forecast

1. **Click Any Forecast Cell** in AR Collections row
2. **Type New Amount**
3. **Press Enter or Click Away** - automatically saves

### Edge Cases

- **Past Weeks:** Not editable (actual data only)
- **Zero Amount:** Allowed (indicates no expected collections)
- **Current Week:** Editable if no actuals posted yet

## Database Schema

### ar_forecast Table
```sql
CREATE TABLE ar_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_ending date NOT NULL UNIQUE,
  forecasted_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ar_forecast_week_ending ON ar_forecast(week_ending);
CREATE TRIGGER update_ar_forecast_updated_at 
  BEFORE UPDATE ON ar_forecast 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Key Fields:**
- `week_ending` - Sunday date for the week (unique)
- `forecasted_amount` - Dollar value for total expected collections
- `notes` - Optional context
- `created_by` - User who created/updated entry

## API Endpoints

### GET /api/ar-forecast

Fetches all AR forecast entries.

**Response:**
```json
{
  "success": true,
  "forecasts": [
    {
      "id": "uuid",
      "week_ending": "2025-12-07",
      "forecasted_amount": 85000.00,
      "notes": null,
      "created_at": "2025-11-27T10:00:00Z",
      "updated_at": "2025-11-27T10:00:00Z"
    }
  ]
}
```

### POST /api/ar-forecast

Upserts AR forecast entry (insert or update on conflict).

**Request:**
```json
{
  "week_ending": "2025-12-07",
  "forecasted_amount": 85000.00
}
```

**Validation:**
- Required fields: week_ending, forecasted_amount
- forecasted_amount must be numeric (can be 0)

**Response:**
```json
{
  "success": true,
  "forecast": { /* created/updated entry */ }
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

### Inline Editing in Forecast Grid

Located in `/app/forecast/components/ForecastGrid.tsx`

**AR Collections Row Behavior:**
- **Past Weeks:** Bold black text, not editable (actuals only)
- **Future Weeks:** Italic blue text, editable on click
- **Edit Mode:** Click cell → becomes input → type amount → Enter/blur saves
- **Visual Feedback:** Editable cells show hover effect + pointer cursor

**Editing State:**
```typescript
const [editingCell, setEditingCell] = useState<{
  weekEnding: string;
  value: string;
} | null>(null);
```

**Cell Rendering (AR row only):**
```typescript
{isEditing ? (
  <input 
    value={editingCell.value}
    onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
    onBlur={handleSave}
    onKeyDown={(e) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') setEditingCell(null);
    }}
    autoFocus
  />
) : (
  <td 
    className={`amount-cell ${isActual ? 'amount-actual' : 'amount-forecast editable-cell'}`}
    onClick={isEditable ? () => handleStartEdit(weekEnding, amount) : undefined}
  >
    {formatCurrency(amount)}
  </td>
)}
```

## Implementation Details

### Forecast Integration

Located in `/lib/forecast/forecast-service.ts`

**Merge AR forecast with actual collections:**
```typescript
// Fetch AR forecasts for future weeks
const { data: arForecasts } = await this.supabase
  .from("ar_forecast")
  .select("*")
  .gte("week_ending", formatDate(latestWeekEnding));

// Add AR forecasts to future weeks
if (arForecasts && arForecasts.length > 0) {
  for (const forecast of arForecasts) {
    const weekEnding = forecast.week_ending;
    
    // Skip if we already have actuals for this week
    if (weekMap.has(weekEnding)) continue;
    
    // Create week with AR forecast
    const categoryBucket = new Map<string, CategoryForecast>();
    
    if (forecast.forecasted_amount > 0) {
      categoryBucket.set("ar_collections", {
        displayGroup: "AR",
        displayLabel: "AR Collections",
        categoryCode: "ar_collections",
        cashDirection: "Cashin",
        amount: forecast.forecasted_amount,
        transactionCount: 0,
        isActual: false, // This is a forecast
        sortOrder: 1
      });
    }
    
    weekMap.set(weekEnding, categoryBucket);
  }
}
```

### Visual Distinction in Forecast Grid

**Forecast grid styling for AR estimates:**
- `font-weight: 400` (vs 600 for actuals)
- `font-style: italic` (vs normal for actuals)
- `color: #3b82f6` (blue vs black for actuals)
- Hover effect on editable cells (light blue background)

**CSS:**
```css
.amount-forecast {
  opacity: 0.85;
  font-weight: 500;
  font-style: italic;
  color: #3b82f6;
}

.editable-cell {
  cursor: pointer;
}

.editable-cell:hover {
  background: linear-gradient(135deg, rgba(240, 249, 255, 0.6) 0%, rgba(240, 249, 255, 0.3) 100%);
  outline: 1px solid rgba(59, 130, 246, 0.3);
}
```

## Completion Criteria

✅ ar_forecast table created (week_ending, forecasted_amount, notes)
✅ API endpoints implemented (GET, POST upsert, DELETE)
✅ Inline editing in forecast grid for future AR Collections cells
✅ Click cell → type amount → Enter/blur saves
✅ Weekly aggregation via table structure (one row per week)
✅ Forecast integration with forecast service
✅ Visual distinction (actual bold black, forecast italic blue)
✅ Auto-generation of all weeks in date range (empty weeks show $0)
⚠️ Save functionality debugging in progress

## Related Modules

- [01-database-schema.md](01-database-schema.md) - ar_forecast table schema
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