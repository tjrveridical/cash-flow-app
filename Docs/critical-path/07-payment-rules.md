# 7. Payment Rules Engine (Step 1: Solo MVP)

## Purpose & Scope

The Payment Rules Engine (also called "Paydate Rules") provides reusable date calculation templates for generating synthetic future transactions in the forecast. These are PURE date templates with NO vendors, NO amounts, NO categories—just recurring date patterns that `forecast_items` will reference.

**Key Concept:** Payment rules are templates like "Monthly_15" or "SemiMonthly_5_17" that define WHEN payments occur. The actual vendor, amount, and category are defined separately in `forecast_items`.

## Human Workflow 👤

### Create Payment Rule

1. **Navigate to Paydate Rules Page** (`/app/paydate-rules`)
   - Page displays table of existing rules
   - Forest green glassmorphic design
   - Stats sidebar shows rule counts by frequency

2. **Click "Add Rule" Button**
   - Modal opens with form
   - Select frequency dropdown (Weekly, SemiMonthly, Monthly, Quarterly, SemiAnnual, Annually)

3. **Fill Frequency-Specific Fields**
   - **Weekly:** Select day of week (Mon-Sun)
   - **Monthly:** Enter day of month (1-31) or check "End of Month"
   - **SemiMonthly:** Enter two anchor days (e.g., 5 and 17)
   - **Quarterly:** Enter day and starting month
   - **SemiAnnual:** Enter two days and two months
   - **Annually:** Enter day and month

4. **Select Business Day Adjustment**
   - **Next:** Move to next business day if falls on weekend/holiday
   - **Previous:** Move to previous business day

5. **Review Generated Rule Name**
   - System auto-generates name: "Monthly_15", "Weekly_Mon", "Quarterly_01_Jan"
   - Duplicate detection prevents name conflicts

6. **Save Rule**
   - Click "Save" button
   - Rule added to table
   - Available for forecast_items to reference

### Edit Payment Rule

1. **Click "Edit" Button** on table row
   - Modal opens pre-populated with rule data
   - Form fields reverse-engineered from stored values

2. **Modify Fields**
   - Change frequency, anchor days, or business day adjustment
   - Rule name updates automatically

3. **Save Changes**
   - Click "Save" button
   - Rule updated in database

### Delete Payment Rule

1. **Click "Del" Button** on table row
   - System checks for dependencies (forecast_items referencing this rule)
   - If dependencies exist: Show warning with count
   - If no dependencies: Confirm deletion

2. **Confirm Deletion**
   - Rule removed from database
   - No longer available for forecast_items

### Edge Cases

- **Duplicate Rule Names:** System prevents creation if name already exists
- **End of Month Handling:** Day 31 adjusted for months with fewer days
- **Business Day Cascading:** Multiple consecutive holidays handled correctly
- **Invalid Anchor Days:** Validation prevents saving (e.g., day 32)

## Database Schema

### payment_rules Table

See [01-database-schema.md](01-database-schema.md#payment_rules-table-new---paydate-rules) for complete schema.

**Key Fields:**
- `rule_name` - Auto-generated unique name (e.g., "Monthly_15", "Weekly_Mon")
- `frequency` - Weekly, SemiMonthly, Monthly, Quarterly, SemiAnnual, Annually
- `anchor_day` - TEXT field: 1-31, "EOM", or "Mon"/"Tue"/etc for weekly
- `anchor_day2` - INT (nullable): Second anchor for SemiMonthly/SemiAnnual
- `months` - TEXT (nullable): Comma-separated month numbers (e.g., "1,4,7,10")
- `business_day_adjustment` - 'next' or 'previous'

**Bootstrap Rules:** Migration seeds 25 production rules automatically.

## API Endpoints

### GET /api/paydate-rules

Fetches all payment rules.

**Response:**
```json
{
  "success": true,
  "rules": [
    {
      "id": "uuid",
      "rule_name": "Monthly_15",
      "frequency": "Monthly",
      "anchor_day": "15",
      "anchor_day2": null,
      "months": null,
      "business_day_adjustment": "next",
      "created_at": "2024-11-27T10:00:00Z",
      "updated_at": "2024-11-27T10:00:00Z"
    },
    {
      "id": "uuid",
      "rule_name": "SemiMonthly_5_17",
      "frequency": "SemiMonthly",
      "anchor_day": "5",
      "anchor_day2": 17,
      "months": null,
      "business_day_adjustment": "next",
      "created_at": "2024-11-27T10:00:00Z",
      "updated_at": "2024-11-27T10:00:00Z"
    }
  ],
  "count": 25
}
```

### POST /api/paydate-rules

Creates new payment rule.

**Request:**
```json
{
  "rule_name": "Monthly_15",
  "frequency": "Monthly",
  "anchor_day": "15",
  "anchor_day2": null,
  "months": null,
  "business_day_adjustment": "next"
}
```

**Validation:**
- Required fields: rule_name, frequency, anchor_day, business_day_adjustment
- Frequency must be one of: Weekly, SemiMonthly, Monthly, Quarterly, SemiAnnual, Annually
- business_day_adjustment must be 'next' or 'previous'
- Duplicate rule_name check

**Response:**
```json
{
  "success": true,
  "rule": { /* created rule */ }
}
```

### PUT /api/paydate-rules/[id]

Updates existing payment rule.

**Request:** Same as POST

**Validation:** Same as POST, plus check for rule existence

**Response:**
```json
{
  "success": true,
  "rule": { /* updated rule */ }
}
```

### DELETE /api/paydate-rules/[id]

Deletes payment rule.

**Validation:**
- Check if rule exists
- Check dependencies (forecast_items referencing this rule)
- Prevent deletion if dependencies exist

**Response:**
```json
{
  "success": true,
  "message": "Rule 'Monthly_15' deleted successfully"
}
```

**Response (Dependencies Exist):**
```json
{
  "success": false,
  "error": "Cannot delete rule 'Monthly_15'. It is referenced by 5 forecast item(s).",
  "dependency_count": 5
}
```

### GET /api/paydate-rules/[id]/dependencies

Returns count and list of forecast_items referencing this rule.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "items": [
    {
      "id": "uuid",
      "vendor": "ADP Payroll",
      "amount": 25000,
      "category_code": "labor_payroll"
    }
  ]
}
```

## UI Components

### /app/paydate-rules/page.tsx

Main paydate rules management page.

**Layout:**
- **Header:** Forest green gradient title, "Add Rule" button
- **Main Table:** Rules with frequency badges, anchor days, ADJ badges
- **Stats Sidebar:** Total rules, counts by frequency
- **Modal:** Create/Edit rule form

**Table Columns:**
- **Rule Name:** Bold, unique identifier
- **Frequency:** Color-coded badge (Blue/Teal/Green/Orange/Purple/Red)
- **Anchor Day:** Primary date anchor (1-31, EOM, Mon-Sun)
- **Anchor Day 2:** Secondary anchor (SemiMonthly/SemiAnnual only)
- **Months:** Comma-separated month numbers (Quarterly/SemiAnnual/Annually)
- **Adj:** Business day adjustment badge (Next/Prev)
- **Actions:** Edit and Delete buttons

**Frequency Badge Colors:**
- **Weekly:** Blue (`bg-blue-50 text-blue-700`)
- **SemiMonthly:** Teal (`bg-teal-50 text-teal-700`)
- **Monthly:** Green (`bg-green-50 text-green-700`)
- **Quarterly:** Orange (`bg-orange-50 text-orange-700`)
- **SemiAnnual:** Purple (`bg-purple-50 text-purple-700`)
- **Annually:** Red (`bg-red-50 text-red-700`)

**ADJ Badge Colors:**
- **Next:** Green (`bg-green-50 text-green-700`)
- **Previous:** Orange (`bg-orange-50 text-orange-700`)

### Modal Form (Create/Edit)

**Dynamic Form Fields** (conditional rendering based on frequency):

#### Weekly
- Day of Week dropdown (Mon, Tue, Wed, Thu, Fri, Sat, Sun)

#### Monthly
- Day of Month input (1-31)
- "End of Month" checkbox (sets anchor_day to "EOM", business_day_adjustment to "previous")

#### SemiMonthly
- Anchor Day 1 input (1-31)
- Anchor Day 2 input (1-31)

#### Quarterly
- Day input (1-31)
- Starting Month dropdown (Jan, Feb, ..., Dec)
- System calculates: `months = [start, start+3, start+6, start+9]`

#### SemiAnnual
- Day 1 input (1-31)
- Month 1 dropdown (Jan-Dec)
- Day 2 input (1-31)
- Month 2 dropdown (Jan-Dec)

#### Annually
- Day input (1-31)
- Month dropdown (Jan-Dec)

**Auto-Generated Rule Name Display:**
- Real-time preview as user types
- Format: `${Frequency}_${Pattern}`
- Examples: "Monthly_15", "Weekly_Mon", "Quarterly_01_Jan", "SemiAnnual_30Apr_31Oct"

**Business Day Adjustment Radio:**
- Next (default)
- Previous

## Implementation Details

### Rule Name Generation

**Algorithm:**
```typescript
function generateRuleName(formData: RuleFormData): string {
  const { frequency } = formData;

  if (frequency === 'Weekly') {
    return `Weekly_${formData.dayOfWeek}`;  // "Weekly_Mon"
  }

  if (frequency === 'Monthly') {
    if (formData.isEOM) {
      return 'Monthly_EOM';
    }
    return `Monthly_${formData.dayOfMonth.padStart(2, '0')}`;  // "Monthly_15"
  }

  if (frequency === 'SemiMonthly') {
    return `SemiMonthly_${formData.semiAnchor1}_${formData.semiAnchor2}`;  // "SemiMonthly_5_17"
  }

  if (frequency === 'Quarterly') {
    const day = formData.quarterlyDay.padStart(2, '0');
    return `Quarterly_${day}_${formData.quarterlyMonth}`;  // "Quarterly_01_Jan"
  }

  if (frequency === 'SemiAnnual') {
    const day1 = formData.semiAnnualDay1.padStart(2, '0');
    const day2 = formData.semiAnnualDay2.padStart(2, '0');
    return `SemiAnnual_${day1}${formData.semiAnnualMonth1}_${day2}${formData.semiAnnualMonth2}`;  // "SemiAnnual_30Apr_31Oct"
  }

  if (frequency === 'Annually') {
    const day = formData.annualDay.padStart(2, '0');
    return `Annually_${day}_${formData.annualMonth}`;  // "Annually_01_Jun"
  }

  return '';
}
```

### Form Field Reverse Engineering (Edit Modal)

**Algorithm:**
```typescript
function populateFormFromRule(rule: PaydateRule): RuleFormData {
  const formData: RuleFormData = {
    frequency: rule.frequency,
    anchor_day: rule.anchor_day,
    anchor_day2: rule.anchor_day2,
    months: rule.months,
    business_day_adjustment: rule.business_day_adjustment
  };

  // Reverse monthMap: "1" -> "Jan", "2" -> "Feb", etc.
  const reverseMonthMap = Object.fromEntries(
    Object.entries(monthMap).map(([k, v]) => [v, k])
  );

  if (rule.frequency === 'Weekly') {
    formData.dayOfWeek = rule.anchor_day;  // "Mon", "Tue", etc.
  }

  if (rule.frequency === 'Monthly') {
    if (rule.anchor_day === 'EOM') {
      formData.isEOM = true;
      formData.dayOfMonth = '';
    } else {
      formData.isEOM = false;
      formData.dayOfMonth = rule.anchor_day;
    }
  }

  if (rule.frequency === 'SemiMonthly') {
    formData.semiAnchor1 = rule.anchor_day;
    formData.semiAnchor2 = rule.anchor_day2?.toString() || '';
  }

  if (rule.frequency === 'Quarterly') {
    formData.quarterlyDay = rule.anchor_day;
    const firstMonth = rule.months?.split(',')[0];
    formData.quarterlyMonth = reverseMonthMap[firstMonth] || '';
  }

  if (rule.frequency === 'SemiAnnual') {
    formData.semiAnnualDay1 = rule.anchor_day;
    formData.semiAnnualDay2 = rule.anchor_day2?.toString() || '';
    const [month1, month2] = rule.months?.split(',') || [];
    formData.semiAnnualMonth1 = reverseMonthMap[month1] || '';
    formData.semiAnnualMonth2 = reverseMonthMap[month2] || '';
  }

  if (rule.frequency === 'Annually') {
    formData.annualDay = rule.anchor_day;
    formData.annualMonth = reverseMonthMap[rule.months] || '';
  }

  return formData;
}
```

### Payment Date Generation Engine (Future)

**Algorithm:**
```typescript
function generateProjectedPayments(
  rules: PaymentRule[],
  startDate: Date,
  endDate: Date
): ProjectedPayment[] {
  const payments: ProjectedPayment[] = [];

  for (const rule of rules) {
    let currentDate = calculateNextOccurrence(rule, startDate);

    while (currentDate <= endDate) {
      // Apply business day adjustment
      const adjustedDate = adjustForBusinessDays(currentDate, rule.business_day_adjustment);

      payments.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        payment_date: adjustedDate
      });

      // Calculate next occurrence
      currentDate = calculateNextOccurrence(rule, currentDate);
    }
  }

  return payments.sort((a, b) => a.payment_date - b.payment_date);
}

function adjustForBusinessDays(date: Date, adjustment: 'next' | 'previous'): Date {
  while (isWeekend(date) || isHoliday(date)) {
    if (adjustment === 'next') {
      date = addDays(date, 1);
    } else {
      date = subDays(date, 1);
    }
  }
  return date;
}
```

### Bootstrap Rules (Migration)

**25 Production Rules Seeded:**
- 5 Annual rules (various dates)
- 15 Monthly rules (days 1, 2, 5, 7, 8, 11, 15, 17, 18, 20, 21, 23, 29, 30, EOM)
- 2 Quarterly rules (different starting months)
- 1 SemiAnnual rule
- 1 SemiMonthly rule
- 1 Weekly rule (Monday)

## Completion Criteria

✅ payment_rules table created with correct schema
✅ Migration seeds 25 bootstrap rules
✅ API routes implemented (GET, POST, PUT, DELETE, dependencies)
✅ UI page with table and stats sidebar
✅ Modal form with dynamic fields
✅ Auto-generated rule names
✅ Form field reverse engineering for edit
✅ Duplicate detection
✅ Dependency checking before delete
✅ Forest green design matching other pages
❌ Payment date generation engine (future - for forecast integration)
❌ Business day adjustment logic (future - requires holidays table integration)
❌ Forecast integration to show projected payments (deferred to forecast_items implementation)

## Related Modules

- [01-database-schema.md](01-database-schema.md) - payment_rules table schema
- [05-forecast-engine.md](05-forecast-engine.md) - Will consume payment rules for future projections
- [06-forecast-dashboard.md](06-forecast-dashboard.md) - Will display projected payments
