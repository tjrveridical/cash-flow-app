# 6. Forecast Dashboard (Excel-Style Grid)

## Purpose & Scope

The Forecast Dashboard is a dynamic React implementation of the forecast spreadsheet mockup, using AG-Grid to display a 26-week rolling cash forecast with horizontal scrolling, frozen columns, section grouping, and drill-down capabilities.

## Human Workflow 👤

### View Forecast Grid

1. **Navigate to Forecast Dashboard** (`/app/forecast`)
   - Page displays 26-week forecast grid
   - Sticky header with gradient background
   - CFO role badge and controls

2. **Review Cash Position**
   - **Top row (pinned):** Beginning Cash for each week
   - **Bottom row (pinned):** Ending Cash for each week
   - **Color coding:** Green = positive, Red = negative
   - **Currency formatting:** $25,000.00 with commas

3. **Analyze Category Breakdown**
   - **Section headers:** CASH INFLOWS, LABOR, COGS, FACILITIES, NL OPEX
   - **Category rows:** Payroll, Rent, Software, etc.
   - **Total rows:** Total Inflows, Total Outflows, Net Cash Flow
   - **Sort order:** CFO-friendly ordering from display_categories

4. **Scroll Horizontally**
   - **Frozen first column:** Category labels stay visible
   - **26+ week columns:** Horizontal infinite scroll
   - **Week-ending dates:** Sunday format (e.g., "11/17/2024")

5. **Drill Into Cell Details**
   - **Double-click any cell** with data
   - DetailModal opens showing:
     - Category name and week-ending date
     - Total amount (color-coded)
     - Transaction list (ready for real data integration)
     - "Edit Rule" button (stub)
   - **Close modal:** Escape key or backdrop click

6. **Filter View (Controls Bar)**
   - **Filter chips:** All, Actuals, Forecast
   - **Active state styling:** Forest green background
   - **Status text:** Shows week count and last updated timestamp
   - Future: Date range picker integration

7. **Export Forecast (Future)**
   - Click "Export" button in header
   - Downloads forecast grid as .xlsx with formatting
   - Or generates PDF report with charts

8. **Set Beginning Cash (Future)**
   - Click "Set Beginning Cash" button in header
   - Modal with glassmorphic design
   - Input fields: Bank account, As-of date, Balance amount
   - Inserts into cash_balances table
   - Updates "Beginning Cash" row in grid

### Edge Cases

- **No Data:** Empty grid shows "No forecast data available"
- **Mixed Actuals/Forecast:** Visual distinction (font-weight, opacity)
- **Future Weeks:** Show $0/blank with placeholder (V1)
- **Large Amounts:** Currency formatting handles billions
- **Negative Balances:** Red text color alerts to cash shortfall

## Database Schema

N/A - Reads from Forecast Engine API. See [05-forecast-engine.md](05-forecast-engine.md) for data sources.

## API Endpoints

### GET /api/forecast/weeks

See [05-forecast-engine.md](05-forecast-engine.md#get-apiforecastweeks) for complete documentation.

**Used by ForecastGrid to:**
- Fetch weekly forecast data
- Transform into AG-Grid row format
- Group categories by display_group
- Calculate running cash balances

## UI Components

### /app/forecast/page.tsx

Main forecast page component.

**Layout:**
- **Sticky header** with gradient background matching mockup
- **"Set Beginning Cash"** and **"Export"** buttons (stubs)
- **CFO role badge** in top right
- **ControlsBar** integration (filter chips)
- **ForecastGrid** integration (AG-Grid)
- **AgGridProvider** for module registration

**Styling:**
- Forest green palette: `#1e3a1e`, `#2d5a2d`, `#3d6b3d`
- Glassmorphic effects: `backdrop-blur(20px)`, `from-white/95`
- Consistent spacing: `px-6`, `py-3`, `gap-3`

### /app/forecast/components/ForecastGrid.tsx

AG-Grid implementation with all forecast logic.

**Grid Features:**
- ✅ **Frozen first column** with category labels (220px width)
- ✅ **Dynamic week-ending columns** (26 weeks, 120px each)
- ✅ **Horizontal infinite scroll**
- ✅ **Section headers** (CASH BALANCE, CASH INFLOWS, LABOR, COGS, FACILITIES, NL OPEX)
- ✅ **Total rows** (Total Inflows, Total Outflows, Net Cash Flow)
- ✅ **Pinned rows** (Beginning Cash, Ending Cash)
- ✅ **Currency formatting** with $ and commas
- ✅ **Color coding:** Green (#059669) positive, Red (#dc2626) negative
- ✅ **Cell double-click** → DetailModal
- ✅ **Actual vs Forecast** visual distinction (font-weight, opacity)
- ✅ **Custom Grid theme** (glassmorphic, subtle gradients)
- ✅ **Row height:** 36px, **Header height:** 44px

**Column Definitions:**
```typescript
const columnDefs = [
  {
    field: 'category',
    headerName: 'Category',
    pinned: 'left',
    width: 220,
    cellClass: 'font-semibold text-slate-700'
  },
  ...weeks.map(week => ({
    field: week.weekEnding,
    headerName: formatDate(week.weekEnding),
    width: 120,
    valueFormatter: currencyFormatter,
    cellClassRules: {
      'text-green-600': 'value > 0',
      'text-red-600': 'value < 0',
      'font-semibold': 'data.isActual',
      'opacity-70': '!data.isActual'
    },
    onCellDoubleClicked: openDetailModal
  }))
];
```

**Row Grouping:**
```typescript
const rowData = [
  { category: 'CASH BALANCE', isHeader: true },
  { category: 'Beginning Cash', isPinned: true, values: {...} },

  { category: 'CASH INFLOWS', isHeader: true },
  { category: 'AR Collections', values: {...} },
  { category: 'Other Revenue', values: {...} },
  { category: 'Total Inflows', isTotal: true, values: {...} },

  { category: 'LABOR', isHeader: true },
  { category: 'Payroll', values: {...} },
  { category: 'Benefits', values: {...} },

  // ... more categories

  { category: 'Total Outflows', isTotal: true, values: {...} },
  { category: 'Net Cash Flow', isTotal: true, values: {...} },
  { category: 'Ending Cash', isPinned: true, values: {...} }
];
```

**Custom Cell Rendering:**
```typescript
function currencyFormatter(params) {
  if (params.value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(params.value);
}
```

### /app/forecast/components/DetailModal.tsx

Transaction detail modal for cell drill-downs.

**Features:**
- Glassmorphic design matching mockup
- Header with category, week-ending date, close button
- Total amount display with color coding
- Transaction list (ready for real data integration)
- "Edit Rule" button (stub)
- Escape key and backdrop click to close
- Smooth animations and transitions

**Transaction List (Future):**
```typescript
interface TransactionDetail {
  date: string;
  vendor: string;
  amount: number;
  description: string;
  source: 'actual' | 'forecast';
  ruleId?: string;  // If from payment rule
}
```

**Modal Content:**
```jsx
<DetailModal isOpen={isOpen} onClose={closeModal}>
  <h2>{category} - Week Ending {weekEnding}</h2>
  <div className="total-amount">
    ${totalAmount.toLocaleString()}
  </div>
  <ul className="transaction-list">
    {transactions.map(tx => (
      <li key={tx.id}>
        <span>{tx.date}</span>
        <span>{tx.vendor}</span>
        <span className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>
          ${tx.amount.toLocaleString()}
        </span>
      </li>
    ))}
  </ul>
  <button onClick={editRule}>Edit Rule</button>
</DetailModal>
```

### /app/forecast/components/ControlsBar.tsx

Top controls bar with filter chips and status.

**Features:**
- Filter chips (All, Actuals, Forecast) with active state styling
- Status text showing week count and last updated timestamp
- Glassmorphic styling matching mockup
- Future: Date range picker integration

**Filter Logic:**
```typescript
function filterWeeks(filter: 'all' | 'actuals' | 'forecast') {
  if (filter === 'actuals') {
    return weeks.filter(w => w.categories.some(c => c.isActual));
  } else if (filter === 'forecast') {
    return weeks.filter(w => w.categories.some(c => !c.isActual));
  }
  return weeks;  // all
}
```

## Implementation Details

### Technology Stack

- **Grid:** AG-Grid Community Edition (`ag-grid-community` + `ag-grid-react`)
- **Framework:** Next.js 14 with React Server Components
- **Styling:** Tailwind CSS with custom AG-Grid theme
- **Route:** `/app/forecast/page.tsx` → `/forecast`

### Visual Design Match

Exact replication of `forecast-spreadsheet.html`:
- ✅ Geist-like font family (`-apple-system, BlinkMacSystemFont, 'SF Pro Display'`)
- ✅ Subtle gradients (green #1e3a1e → #2d5a2d → #3d6b3d on headers)
- ✅ Glassmorphic effects (`backdrop-blur`, `from-white/95`, transparency layers)
- ✅ Consistent spacing (px-6, py-3, gap-3)
- ✅ Density and font sizes (12px body, 11px headers)
- ✅ Section headers: bold, uppercase, tracking-wide
- ✅ Total rows: subtle background, border-top separator
- ✅ Clean Grid theme (no heavy borders, subtle row hover)

### Data Integration

Grid fetches from `GET /api/forecast/weeks?weeksCount=26` and:
- Transforms API response into Grid row format
- Groups categories by `display_group`
- Sorts by `sort_order` from `display_categories`
- Handles AR split (AR Collections vs Other Revenue)
- Calculates running cash balances per week
- Distinguishes actual vs forecast values

**Transform Logic:**
```typescript
function transformToGridRows(forecast: ForecastResult): RowData[] {
  const rows: RowData[] = [];

  // Add Beginning Cash pinned row
  rows.push({
    category: 'Beginning Cash',
    isPinned: true,
    ...mapWeekValues(forecast.weeks, w => w.beginningCash)
  });

  // Group categories by display_group
  const groups = groupBy(forecast.weeks.flatMap(w => w.categories), 'displayGroup');

  // Add each group with header
  Object.entries(groups).forEach(([group, categories]) => {
    rows.push({ category: group, isHeader: true });

    categories.forEach(cat => {
      rows.push({
        category: cat.displayLabel,
        ...mapWeekValues(forecast.weeks, w =>
          w.categories.find(c => c.categoryCode === cat.categoryCode)?.amount
        )
      });
    });

    // Add group total if needed
    if (['CASH INFLOWS', 'CASH OUTFLOWS'].includes(group)) {
      rows.push({
        category: `Total ${group}`,
        isTotal: true,
        ...calculateGroupTotals(forecast.weeks, group)
      });
    }
  });

  // Add Net Cash Flow total
  rows.push({
    category: 'Net Cash Flow',
    isTotal: true,
    ...mapWeekValues(forecast.weeks, w => w.netCashFlow)
  });

  // Add Ending Cash pinned row
  rows.push({
    category: 'Ending Cash',
    isPinned: true,
    ...mapWeekValues(forecast.weeks, w => w.endingCash)
  });

  return rows;
}
```

### Grid Theme Customization

**Custom CSS:** `/app/forecast/ag-grid-theme.css`

```css
.ag-theme-forecast {
  --ag-border-color: rgba(30, 58, 30, 0.08);
  --ag-header-background-color: linear-gradient(to right, #1e3a1e, #2d5a2d);
  --ag-header-foreground-color: white;
  --ag-row-hover-color: rgba(240, 248, 242, 0.3);
  --ag-odd-row-background-color: rgba(255, 255, 255, 0.95);
  --ag-even-row-background-color: rgba(248, 250, 252, 0.95);
  --ag-font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  --ag-font-size: 12px;
  --ag-row-height: 36px;
  --ag-header-height: 44px;
}

.ag-theme-forecast .ag-pinned-left-cols-container {
  background: linear-gradient(to right, white 90%, transparent);
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
}

.ag-theme-forecast .ag-header-cell {
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 11px;
}
```

## Completion Criteria

✅ AG-Grid Community Edition integrated
✅ Frozen first column with category labels
✅ Dynamic 26-week columns with horizontal scroll
✅ Section headers and total rows
✅ Pinned rows (Beginning Cash, Ending Cash)
✅ Currency formatting and color coding
✅ Cell double-click → DetailModal
✅ Actual vs Forecast visual distinction
✅ Custom Grid theme matching mockup
✅ ControlsBar with filter chips
✅ Glassmorphic styling throughout
❌ Real transaction data in DetailModal (needs new API endpoint)
❌ "Set Beginning Cash" modal implementation (Section 8.9)
❌ Export functionality (Section 11.2)
❌ Date range picker (Section 10.5)
❌ Mobile responsive layout (Section 11.3)

## Related Modules

- [05-forecast-engine.md](05-forecast-engine.md) - Provides weekly forecast data
- [07-payment-rules.md](07-payment-rules.md) - Adds future projections to grid
- [08-ar-estimation.md](08-ar-estimation.md) - Adds AR forecast inflows
