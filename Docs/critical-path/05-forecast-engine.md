# 5. Forecast Engine

## Purpose & Scope

The Forecast Engine performs weekly cash flow aggregation from verified historical transactions, joining across `raw_transactions`, `classified_bank_transactions`, and `display_categories` to produce a 14-26 week rolling forecast. The engine calculates running cash balances and implements AR split logic to separate collections from other revenue.

## Database Schema

### category_code Column

Added to `classified_bank_transactions`:
```sql
ALTER TABLE classified_bank_transactions
ADD COLUMN category_code TEXT NOT NULL;

CREATE INDEX idx_classified_transactions_category
ON classified_bank_transactions(category_code);

ALTER TABLE classified_bank_transactions
ADD CONSTRAINT fk_category_code
FOREIGN KEY (category_code)
REFERENCES display_categories(category_code);
```

**Purpose:** Enables direct joins between transactions and display hierarchy. Replaces old `classification` text field.

**Migration Note:** Classification engine updated to output `category_code` matching `display_categories.category_code`.

### cash_balances Table

See [01-database-schema.md](01-database-schema.md#cash_balances-table) for complete schema.

**Usage:**
- Manual CFO entry of starting cash positions
- Used as "Beginning Cash" in forecast grid
- V1: Single manual entry per bank account
- V2: Automated reconciliation with bank feeds

## API Endpoints

### GET /api/forecast/weeks

Fetches weekly forecast data with historical actuals.

**Query Parameters:**
- `startDate` (optional) - Start date for forecast range
- `endDate` (optional) - End date for forecast range
- `weeksCount` (optional, default: 14) - Number of weeks to return

**Response:**
```json
{
  "success": true,
  "weeks": [
    {
      "weekEnding": "2024-11-17",
      "beginningCash": 125000.00,
      "totalInflows": 45000.00,
      "totalOutflows": -38000.00,
      "netCashFlow": 7000.00,
      "endingCash": 132000.00,
      "categories": [
        {
          "displayGroup": "AR",
          "displayLabel": "AR Collections",
          "displayLabel2": null,
          "categoryCode": "ar_collections",
          "cashDirection": "Cashin",
          "amount": 35000.00,
          "transactionCount": 3,
          "isActual": true,
          "sortOrder": 1.0
        },
        {
          "displayGroup": "Labor",
          "displayLabel": "Payroll",
          "displayLabel2": null,
          "categoryCode": "labor_payroll",
          "cashDirection": "Cashout",
          "amount": -25000.00,
          "transactionCount": 1,
          "isActual": true,
          "sortOrder": 2.0
        }
      ]
    }
  ]
}
```

**V1 Scope:** Historical/actual weeks only (up to latest transaction date). Future weeks show $0/blank with placeholder (payment rules deferred to [Section 7](07-payment-rules.md)).

## UI Components

N/A - Backend service only. Consumed by [06-forecast-dashboard.md](06-forecast-dashboard.md).

## Implementation Details

### Forecast Types

**File:** `/lib/forecast/types.ts`

```typescript
interface WeeklyForecast {
  weekEnding: string;  // ISO date (Sunday)
  beginningCash: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  endingCash: number;
  categories: CategoryForecast[];
}

interface CategoryForecast {
  displayGroup: string;  // AR, Labor, COGS, Facilities, etc.
  displayLabel: string;  // Payroll, Rent, Software, etc.
  displayLabel2?: string | null;  // Optional 3rd level
  categoryCode: string;  // Unique identifier
  cashDirection: "Cashin" | "Cashout";
  amount: number;  // Positive or negative
  transactionCount: number;
  isActual: boolean;  // true = historical, false = forecast
  sortOrder: number;  // From display_categories
}

interface ForecastResult {
  weeks: WeeklyForecast[];
  metadata: {
    startDate: string;
    endDate: string;
    actualWeeks: number;
    forecastWeeks: number;
    lastTransactionDate: string;
  };
}
```

### Forecast Service

**File:** `/lib/forecast/forecast-service.ts`

**Core Weekly Aggregation Logic:**

```typescript
async function generateWeeklyForecast(
  startDate: Date,
  endDate: Date
): Promise<ForecastResult> {
  // 1. Calculate week-ending dates (Sundays)
  const weeks = calculateWeekEndings(startDate, endDate);

  // 2. Fetch beginning cash from cash_balances table
  const beginningCash = await getBeginningCash(startDate);

  // 3. For each week:
  const weeklyData = await Promise.all(weeks.map(async (weekEnding) => {
    // a. Fetch all transactions for that week
    const transactions = await supabase
      .from("classified_bank_transactions")
      .select(`
        id, category_code,
        transaction:raw_transactions (
          date, amount, qb_account_name
        ),
        category:display_categories (
          display_group, display_label, display_label2,
          cash_direction, sort_order
        )
      `)
      .eq("is_verified", true)
      .gte("transaction.date", weekStartDate)
      .lte("transaction.date", weekEnding);

    // b. Apply AR split logic
    const categorized = applyARSplitLogic(transactions);

    // c. Group by category_code and sum amounts
    const categoryTotals = groupByCategory(categorized);

    // d. Calculate running cash balance
    const inflows = sum(categoryTotals.filter(c => c.cashDirection === "Cashin"));
    const outflows = sum(categoryTotals.filter(c => c.cashDirection === "Cashout"));
    const netCashFlow = inflows + outflows;  // outflows are negative
    const endingCash = beginningCash + netCashFlow;

    return {
      weekEnding,
      beginningCash,
      totalInflows: inflows,
      totalOutflows: outflows,
      netCashFlow,
      endingCash,
      categories: categoryTotals.sort((a, b) => a.sortOrder - b.sortOrder)
    };
  }));

  // 4. Return forecast result
  return {
    weeks: weeklyData,
    metadata: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      actualWeeks: weeklyData.filter(w => w.categories.length > 0).length,
      forecastWeeks: 0,  // V1: no forecasts yet
      lastTransactionDate: await getLastTransactionDate()
    }
  };
}
```

### AR Split Logic

**Purpose:** Separate "AR Collections" from "Other Revenue" for accurate cash inflow tracking.

**Algorithm:**
```typescript
function applyARSplitLogic(transactions: Transaction[]): Transaction[] {
  return transactions.map(tx => {
    // Check if transaction is on cash accounts (1000, 1010, 1015, 1020)
    const isCashAccount = ['1000', '1010', '1015', '1020'].some(acct =>
      tx.transaction.qb_account_name?.includes(acct)
    );

    // Check if transaction is positive (inflow)
    const isPositive = tx.transaction.amount > 0;

    // Check if account name contains "1200 Accounts Receivable"
    const isARAccount = tx.transaction.qb_account_name?.includes('1200 Accounts Receivable');

    // Decision logic
    if (isCashAccount && isPositive) {
      if (isARAccount) {
        // Override category to AR Collections
        return {
          ...tx,
          category_code: 'ar_collections',
          category: {
            display_group: 'AR',
            display_label: 'AR Collections',
            display_label2: null,
            cash_direction: 'Cashin',
            sort_order: 1.0
          }
        };
      } else {
        // Classify as Other Revenue
        return {
          ...tx,
          category_code: 'other_revenue',
          category: {
            display_group: 'Other Revenue',
            display_label: 'Other Revenue',
            display_label2: null,
            cash_direction: 'Cashin',
            sort_order: 1.5
          }
        };
      }
    }

    // Return transaction unchanged
    return tx;
  });
}
```

**Why This Matters:**
- CFO needs to see AR collections separately from other revenue
- Enables accurate AR aging and collection tracking
- Supports AR forecasting module (Section 8)

### Running Cash Balance Calculation

```typescript
function calculateRunningBalances(weeks: WeeklyForecast[]): WeeklyForecast[] {
  let runningCash = weeks[0].beginningCash;

  return weeks.map(week => {
    const beginningCash = runningCash;
    const netCashFlow = week.totalInflows + week.totalOutflows;
    const endingCash = beginningCash + netCashFlow;

    runningCash = endingCash;  // Carry forward to next week

    return {
      ...week,
      beginningCash,
      endingCash
    };
  });
}
```

### Classification Engine Updates

Updated all classification modules to output `category_code`:

#### rules.ts
- GL account rules map to specific category codes (e.g., `labor_payroll`, `facilities_rent`)
- Keyword rules output structured `{ categoryCode, label }` format
- Prefix matching for account ranges (5xxx → Labor, 6xxx → Opex)

#### engine.ts
- Writes `category_code` to database in all insert/update operations
- Default unclassified → `other_other` category code
- Batch processing updated to include category_code

### Data Flow

```
raw_transactions
  → classified_bank_transactions (category_code, is_verified = true)
    → display_categories (hierarchy, labels, sort_order)
      → ForecastService (weekly aggregation, AR split logic)
        → GET /api/forecast/weeks (JSON response)
          → ForecastGrid (UI display)
```

## Completion Criteria

✅ category_code column added to classified_bank_transactions
✅ cash_balances table created
✅ Classification engine outputs category_code
✅ ForecastService with weekly aggregation
✅ AR split logic implemented
✅ Running cash balance calculations
✅ API endpoint GET /api/forecast/weeks
✅ Historical actuals only (V1)
❌ Future projections from payment rules (Section 7)
❌ AR forecast integration (Section 8)
❌ Automated cash balance reconciliation (V2)

## Related Modules

- [01-database-schema.md](01-database-schema.md) - classified_bank_transactions, cash_balances, display_categories
- [03-classification-engine.md](03-classification-engine.md) - Produces category_code for forecast
- [04-verification-inbox.md](04-verification-inbox.md) - Verifies transactions before forecast
- [06-forecast-dashboard.md](06-forecast-dashboard.md) - Displays forecast data
- [07-payment-rules.md](07-payment-rules.md) - Adds future projections
- [08-ar-estimation.md](08-ar-estimation.md) - Adds AR forecast inflows
