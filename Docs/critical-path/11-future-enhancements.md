# 11. Future Enhancements (Post-V1)

## Purpose & Scope

This module documents features and enhancements planned for post-V1 releases. These are NOT blocking the V1 launch and should be prioritized based on user feedback from Step 3 (Leadership Access rollout).

**Important:** Scenario modeling (Section 11.1) is a separate epic requiring significant design and implementation effort. Do not start until V1 is stable and user feedback validates the need.

## Scenario Modeling (Step 4 - Separate Epic)

### Purpose

"What-if" analysis for hiring, terminations, and cost changes to model runway impact.

### Baseline Snapshots

**Concept:**
- Save current forecast state as "Baseline" scenario
- Clone baseline to create new scenario
- Scenarios stored in `forecast_scenarios` table with snapshot date

**Database Schema:**
```sql
CREATE TABLE forecast_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_scenario_id UUID REFERENCES forecast_scenarios(id),
  snapshot_date DATE NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scenario_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES forecast_scenarios(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL,  -- 'hire', 'fire', 'cost_change', 'revenue_change'
  category_code TEXT REFERENCES display_categories(category_code),
  amount_delta NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### What-If Adjustments

**Hire Employee:**
- Add new row to Labor category with start date, salary, burden rate
- Automatically calculate payroll taxes, benefits, overhead
- Impact: Increased monthly outflows

**Fire Employee:**
- Remove row or set end date
- Include severance costs (one-time)
- Impact: Reduced monthly outflows

**Cost Change:**
- Adjust payment rule amount (e.g., rent increase from $10K to $12K)
- Effective date and optional end date
- Impact: Changed monthly outflows

**Budget vs Actual:**
- Import budget from Excel or manual entry
- Compare scenario to actual results over time
- Variance report: Category-level over/under analysis

### Scenario Comparison UI

**Dropdown in Forecast Header:**
- Switch between: Baseline, Scenario A, Scenario B, etc.
- Show active scenario name

**Side-by-Side View:**
- Split screen: Baseline on left, Scenario A on right
- Same 26-week grid format
- Scroll both grids in sync

**Diff Highlighting:**
- Green cells: Favorable variance (higher cash)
- Red cells: Unfavorable variance (lower cash)
- Gray cells: No change

**Impact Summary:**
- "This hire extends runway by 8 weeks"
- "This cost reduction increases cash by $50K"
- "Ending cash: Baseline $125K → Scenario A $175K (+$50K)"

### Employee Cost Engine

**Fully Burdened Cost Calculation:**

```typescript
interface EmployeeCost {
  baseSalary: number;
  payrollTaxes: number;  // 7.65% FICA
  benefits: {
    health: number;
    dental: number;
    vision: number;
    retirement401k: number;
    ptoAccrual: number;
  };
  overheadAllocation: number;  // % of facilities, IT, admin
  totalMonthlyCost: number;
}

function calculateEmployeeCost(
  annualSalary: number,
  benefits: BenefitsConfig,
  overheadRate: number
): EmployeeCost {
  const monthlySalary = annualSalary / 12;
  const payrollTaxes = monthlySalary * 0.0765;  // FICA
  const totalBenefits = Object.values(benefits).reduce((sum, b) => sum + b, 0);
  const overhead = monthlySalary * overheadRate;

  return {
    baseSalary: monthlySalary,
    payrollTaxes,
    benefits,
    overheadAllocation: overhead,
    totalMonthlyCost: monthlySalary + payrollTaxes + totalBenefits + overhead
  };
}
```

**Example:**
- Base Salary: $80,000/year = $6,667/month
- Payroll Taxes: $510/month (7.65%)
- Benefits: $800/month (health, dental, 401k match)
- Overhead: $1,000/month (15% allocation)
- **Total Monthly Cost:** $8,977

### Budget vs Actual Variance

**Import Budget:**
- Excel upload with categories and monthly amounts
- Or manual entry per category

**Variance Report:**
```typescript
interface VarianceReport {
  category: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  status: 'over' | 'under' | 'on_track';
}
```

**Alerts:**
- Flag categories >10% over budget
- Email notification to CFO/Controller
- Display in red on forecast grid

**Example:**
- Category: Payroll
- Budget: $25,000/month
- Actual: $27,500/month
- Variance: +$2,500 (+10%)
- Status: Over budget ⚠️

### Implementation Notes

**Scenario modeling is a separate epic, not blocking V1 launch.**

Prioritize based on user feedback:
- If users request "what-if" analysis frequently → prioritize
- If users are satisfied with baseline forecast → defer
- Estimated effort: 3-4 weeks development + testing

---

## Export Capabilities

### Excel Export

**Feature:** Download forecast grid as .xlsx with formatting

**Implementation:**
- Library: `xlsx` or `exceljs`
- Format: Mimic grid layout with colors, borders, currency formatting
- Include: All 26 weeks, categories, totals, beginning/ending cash

**Code Example:**
```typescript
import * as XLSX from 'xlsx';

function exportToExcel(forecast: ForecastResult) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(transformToExcelData(forecast));

  // Apply formatting (colors, borders, currency)
  applyExcelFormatting(worksheet);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Forecast');
  XLSX.writeFile(workbook, `forecast-${new Date().toISOString()}.xlsx`);
}
```

### PDF Reports

**Feature:** Generate executive summary with charts

**Implementation:**
- Library: `jsPDF` or `puppeteer` (for HTML → PDF)
- Include:
  - Summary metrics (ending cash, net cash flow, runway)
  - Chart: Weekly cash balance line chart
  - Table: Top 10 categories by outflow
  - Variance highlights

**Example Layout:**
```
Cash Flow Forecast Report
Generated: 2024-11-27

Summary
- Ending Cash (Week 26): $175,000
- Net Cash Flow (26 weeks): +$50,000
- Runway: 42 weeks

[Chart: Weekly Cash Balance Line Chart]

Top Categories by Outflow
1. Payroll: -$650,000
2. Rent: -$120,000
3. Software: -$45,000
...
```

### API Export

**Feature:** JSON endpoint for integrations (e.g., Slack bot)

**Implementation:**
```typescript
// GET /api/forecast/export
export async function GET(req: Request) {
  const forecast = await generateWeeklyForecast(startDate, endDate);

  return NextResponse.json({
    export_date: new Date().toISOString(),
    forecast_weeks: forecast.weeks.length,
    ending_cash: forecast.weeks[forecast.weeks.length - 1].endingCash,
    runway_weeks: calculateRunway(forecast),
    data: forecast
  });
}
```

**Use Cases:**
- Daily Slack digest: "Your forecast ending cash is $175K (42 weeks runway)"
- Zapier integration: Trigger alert if ending cash < $100K
- PowerBI/Tableau dashboard: Pull forecast data for visualization

---

## Additional Future Ideas

### Mobile Responsive

**Optimize forecast grid for tablet/phone:**
- Vertical card layout for mobile
- Swipeable weeks (carousel)
- Collapsible category sections
- Touch-friendly drill-downs

**Breakpoints:**
- Desktop: Full grid (>1024px)
- Tablet: Condensed grid (768px-1024px)
- Mobile: Vertical cards (<768px)

### Slack Notifications

**Daily digest of unverified transactions:**
- Scheduled job: Check unverified count at 9am daily
- If count > 0: Send Slack message to #finance channel
- Message: "You have 12 unverified transactions. Review now: [link]"

**Implementation:**
- Slack webhook or Bot API
- Cron job (Vercel Cron or external scheduler)

### QuickBooks OAuth

**Direct API sync (no CSV import):**
- OAuth 2.0 integration with QuickBooks Online API
- Automated nightly sync of transactions
- Eliminate manual CSV downloads
- Real-time balance updates

**Implementation:**
- Library: `node-quickbooks`
- Store OAuth tokens in database (encrypted)
- Scheduled job: Fetch new transactions daily

### ML Classification v2

**Fine-tune model with verified data:**
- Export verified transactions as training data
- Fine-tune GPT-4 or custom model
- Return top 3 suggestions with confidence scores
- Learn from user corrections (feedback loop)

**Data Format:**
```json
{
  "description": "ADP Payroll 11/15/2024",
  "amount": -25000,
  "qb_account": "1000 Operating Cash",
  "category_code": "labor_payroll",
  "verified": true
}
```

### Anomaly Detection

**Flag unusual transactions for review:**
- Detect outliers (e.g., payment 3x normal amount)
- Flag new vendors (not seen in last 90 days)
- Alert on duplicate transactions (same amount/date/vendor)
- Confidence scores for auto-flagging

**Example:**
- Transaction: "Office Depot $15,000" (normal: $500)
- Alert: "⚠️ Unusual amount detected. Review before verifying."
- User: Investigates, confirms valid (large furniture order)

---

## Completion Criteria

**All items in this module are future enhancements and NOT required for V1 launch.**

Prioritize based on:
1. User feedback from Step 3 rollout
2. Pain points identified during testing
3. Business value and ROI
4. Development effort and complexity

**Decision Framework:**
- **High Value + Low Effort** → Prioritize for v1.1
- **High Value + High Effort** → Prioritize for v2.0 (e.g., Scenario Modeling)
- **Low Value** → Defer indefinitely

## Related Modules

- [06-forecast-dashboard.md](06-forecast-dashboard.md) - Export buttons and scenario dropdown
- [09-multi-user.md](09-multi-user.md) - Feedback collection process
- [10-leadership-access.md](10-leadership-access.md) - Scale features as needed
