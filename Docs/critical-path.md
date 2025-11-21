## 1.3 Implement Core Database Schema  
Tables implemented:
- `user_profiles`
- `raw_transactions`
- `bank_accounts`
- `exclusion_rules`
- `classified_bank_transactions`
- `holidays`
- `payment_rules`
- `import_history`

These provide the foundational data model for ingestion, classification, forecasting, and rule-based automation.

---

# 2. Data Ingestion Pipeline

## 2.1 CSV Parser  
Handles:
- Skipping report preamble rows
- Extracting header row
- Normalizing headers into internal keys
- Removing trailing summary/footer rows
- Producing structured `RawCSVRow[]`

## 2.2 CSV Validator  
Enforces ingestion rules:
- Required fields present:
- distribution_account  
- transaction_date  
- transaction_type  
- amount
- Account must be one of:
- 1000  
- 1010  
- 1015  
- 1020
- Exclude transaction types:
- Transfer  
- Journal Entry
- Validate numeric amount and valid date

## 2.3 Transaction Mapper  
Maps validated CSV rows → internal model:
- date  
- amount  
- description  
- transaction_type  
- source_system = "quickbooks"
- source_id (dedupe key)
- qb_account_number  
- qb_account_name  
- metadata (extensible)

## 2.4 Import Service  
Coordinates full ingestion:
- Parse → validate → map
- Perform duplicate detection
- Insert into `raw_transactions`
- Record errors and counts
- Return a structured `CSVImportResult`

## 2.5 Import UI  
User-facing features:
- CSV upload  
- Display progress and validation errors  
- Show import results  
- Accessible to authorized roles

**Milestone Reached:**  
The ingestion pipeline now imports real QuickBooks Transaction Detail CSVs with row-level validation and clean insertion into `raw_transactions`.

---

# 3. Classification Engine (Next Major Milestone)

Purpose: Convert raw imported rows into structured cash-flow transactions.

## 3.1 Classification Rules  
- Include only rows sourced from:
- 1000 Bank of America  
- 1010 Bill.com Money Out Clearing  
- 1015 Genesis Reserve  
- 1020 Genesis Operating  
- Exclude:
- Transfer  
- Journal Entry  
- Classification:
- amount > 0 → cash_in  
- amount < 0 → cash_out  
- amount = 0 → exclude

## 3.2 Classification Output  
Writes to `classified_bank_transactions`:
- transaction_id → FK to raw_transactions  
- classification → cash_in / cash_out / exclude  
- classification_source → rule-based or manual  
- rule_id (if exclusion rule applied)  
- confidence_score  
- metadata / notes  

## 3.3 API Endpoint  
`POST /api/classification/run`  
- Processes all unclassified transactions  
- Applies rule engine  
- Reports summary counts

## 3.4 Review Workflow (Optional Extension)  
For Journal Entries or ambiguous transactions:
- Queue for manual review  
- Approve/Exclude/Reclassify

---

# 4. Forecast Engine

After classification, construct weekly cash flow.

## 4.1 Weekly Aggregation  
Group classified transactions into week-ending buckets:
- cash_in  
- cash_out  
- net_total  
- transaction_count  
- drill-down rows

## 4.2 Forecast View  
Supabase view:
- Joins classification + raw transactions  
- Applies display labels  
- Outputs aggregated, ready-to-render forecast data

## 4.3 Forecast API  
`GET /api/forecast/weeks`
- Returns structured weekly buckets
- Supports date-range filtering

---

# 5. Forecast Dashboard (Excel-Style Grid)

## 5.1 UI Structure
- Rows = categories (Payroll, Rent, COGS, etc.)
- Columns = week ending dates
- Cells = dollar values (net, inflow, outflow)
- Drill-down modal showing underlying transactions

## 5.2 Features  
- Frozen header column
- Horizontal scroll for infinite weeks
- Event-driven updates
- Snapshot system for "as-of" reporting

---

# 6. Display Categorization Engine (Phase 2)

Purpose: Replace raw GL accounts with meaningful business categories.

## 6.1 Mapping  
- Map QB account number → display category  
- Groups:
- Payroll  
- Rent  
- Union  
- Software  
- Insurance  
- Taxes  
- Other Non-Labor  
- COGS  

## 6.2 UI & API  
- Category editor  
- Category assignment rules  
- Category-level reporting

---

# 7. Payment Rules & Recurring Outflows (Phase 3)

Purpose: Extend forecast into the future beyond historical data.

## 7.1 Rule Types  
- Payroll cycles  
- Rent schedules  
- Subscription-based expenses  
- Insurance premiums  
- Car/allowance payments  
- Tax payments  
- Loan/lease schedules

## 7.2 Payment Rule Engine  
Generate synthetic future transactions using:
- anchor day  
- anchor type  
- frequency  
- business day adjustment  
- conditional logic  

## 7.3 Integration With Forecast  
Future-dated items appear in weekly buckets alongside historical transactions.

---

# 8. Scenario Planning (Phase 4)

Purpose: Enable CFO/CEO-level modeling.

## 8.1 Employee Cost Engine  
- Fully burdened cost per employee  
- Benefits, allowances, taxes  
- Union vs non-union rules

## 8.2 Scenarios  
- Hiring plan scenarios  
- Termination scenarios  
- Cost-change scenarios  
- Budget vs actual tracking

## 8.3 “Can We Afford This Hire?”  
Instant runway impact simulation:
- Cash-on-hand  
- Weekly burn  
- Projected future cash  
- Headcount cost overlays

---

# 9. Future Enhancements

## 9.1 Historical Variance Detection  
- Flags abnormal spend spikes  
- Tracks category drift  
- Detects missing expected payments

## 9.2 Alerts & Notifications  
- Upcoming rent  
- Payroll week  
- Insurance renewals  
- Low-cash warnings

## 9.3 Export Capabilities  
- Excel export  
- PDF reports  
- API export

---

# Summary Critical Path

1. **Finish ingestion** (complete)  
2. **Build classification engine** ← next  
3. **Build weekly forecast engine**  
4. **Render forecast dashboard (Excel-style)**  
5. **Implement category mapping**  
6. **Add payment rules for future projections**  
7. **Build scenario-planning engine**  

This is the complete high-level roadmap for the Cash Flow Application.