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

## 2.6 Recent Improvements
- Fixed header normalization to convert CSV headers like "Transaction date" → "transaction_date"
- Synchronized normalization logic between parser and validator
- Added support for headers with special characters and slashes (e.g., "Memo/Description" → "memo_description")

**Milestone Reached:**
The ingestion pipeline now imports real QuickBooks Transaction Detail CSVs with row-level validation and clean insertion into `raw_transactions`.

---

# 3. Classification Engine

Purpose: Convert raw imported rows into meaningful categorized transactions.

## 3.1 Classification Modules Implemented

### types.ts
- `RawTxInput` interface matching raw_transactions schema
- `ClassificationRecord` interface for classification results
- `ClassificationRule` interface for rule definitions

### rules.ts - Deterministic Rules Engine
- **GL Account-based classification:**
  - Maps account numbers (1000, 1010, 1020, etc.) to categories
  - Handles Labor (5xxx), COGS (4xxx), Opex (6xxx) accounts
  - AR/AP (1200, 2010) and Cash accounts
- **Keyword-based rules:**
  - Payroll detection (payroll, salary, ADP)
  - Rent detection (Irvine Company, Paylease, Princeland)
  - Utilities (Verizon, AT&T, internet, electricity)
  - Bank fees and service charges
  - American Express cash back rewards
- **Priority-based matching** with weighted rule application

### historical.ts - Historical Inference
- Queries past classifications by GL account number
- Finds similar transactions using description word-overlap (60%+ threshold)
- Uses weighted voting for classification inference
- Requires 70%+ consensus for GL-based matches

### mlAssist.ts - ML Integration Stub
- Placeholder for future ML-based classification
- Ready for v2 implementation with embeddings/neural networks

### engine.ts - Main Classification Engine
- **Decision tree:**
  1. Skip if manual classification exists (preserve human decisions)
  2. Try deterministic rules
  3. Try historical inference
  4. Try ML suggestion (currently stub)
  5. Default to "Unclassified"
- **Batch processing:** `classifyBatch(limit)` for unclassified transactions
- **Reclassification:** `reclassifyTransaction()` for rule updates
- Uses system user ID (00000000-0000-0000-0000-000000000000) for automated classifications

## 3.2 Classification Output
Writes to `classified_bank_transactions`:
- transaction_id → FK to raw_transactions
- classification → meaningful category string (e.g., "Labor: Payroll", "Opex: Rent")
- classification_source → "rules", "history", "ml_assist", "manual", "imported"
- rule_id (optional, for future rule tracking)
- confidence_score (null, not used in v1)
- notes (explanation of classification logic)
- classified_at, classified_by (audit trail)

## 3.3 API Endpoint
`POST /api/classification/run`
- Processes all unclassified transactions
- Applies full decision tree
- Reports summary counts

## 3.4 Design Mockups Created
- verification-inbox.html
- master-ledger.html
- forecast-spreadsheet.html
- payment-rules.html
- ar-forecast.html

**Milestone Reached:**
Complete classification engine with deterministic rules, historical inference, ML stubs, and batch processing capabilities. System respects manual classifications and provides full audit trail.

# 3.5 Display Category Hierarchy Architecture (Critical Mid-Build Correction)

During the buildout of the forecast engine, we discovered that the initial approach to display-level categorization was insufficient for the real-world structure of WCTV’s financial data. The original assumption—that a single two-level naming structure would cover both the forecast spreadsheet and expense-card drilldowns—proved incorrect once real COGS and operational categories were ingested.

This led to a significant but necessary redesign of the **display category system**, ensuring that both forecast-level aggregation and expense-card detail classification remain clean, stable, and extensible.

## 3.5.1 The Problem That Emerged
Once we imported actual category rows from CSV (Payroll, Rent, Software, Nurse Call, PXP, etc.), three issues surfaced:

1. **COGS requires a 3-level hierarchy**  
   Example:  
    COGS → Hardware → Nurse Call
    COGS → Software → PXP
2. **The expense card drilldown categories are more granular**  
(e.g. Mileage → Construction)

3. **The forecast spreadsheet requires stable, top-level categories**  
rather than raw GL accounts or inconsistent free-text labels.

Additionally, when parent rows were auto-created for each `display_group`, duplicate parent rows formed (e.g. two “Labor” rows), creating inconsistent `parent_id` relationships and preventing clean aggregation.

## 3.5.2 The Key Insight
A single table can support all category operations if we add the right structural fields:

- **`scope`** to separate forecast categories, card categories, or shared categories  
- **`display_label2`** to allow true 3-level hierarchies  
- **stable, unique `category_code`** for internal joins  
- **proper top-level parent rows for each `display_group`**

This design allows one unified category registry without dual systems.

## 3.5.3 What We Did
To fix the structure and restore deterministic hierarchy:

1. **Inserted or validated one top-level parent row** for each `display_group`  
(`parent_id = NULL`, `display_label = display_group`)

2. **Assigned all level-2 children** (`display_label`) to the correct parent

3. **Generated level-3 children** where `display_label2` was present (COGS only)

4. **Fixed the duplicate parent row issue**  
- Identified correct parent (the row with `parent_id IS NULL`)  
- Reparented all children of duplicate rows to the correct parent  
- Deleted the duplicates safely without breaking FK constraints

5. **Rebuilt `sort_order`** using a CFO-friendly scheme:  
- Level 1: AR → Labor → Facilities → Software → Insurance → Taxes → NL Opex → Expense Card → COGS → Misc  
- Level 2: alphabetical within group  
- Level 3: alphabetical fractional ordering under level-2 parents

6. **Cleaned `category_code` values** to ensure uniqueness and remove trailing underscores.

## 3.5.4 Why This Was Necessary
This restructuring was required so that:

- Forecast rows align with true business categories  
- Expense-card drilldowns retain needed granularity  
- COGS rows display correctly in the 3-level hierarchy  
- Classification output can map reliably into categories  
- Future payment rules (rent, payroll, software, insurance) attach cleanly  
- The Excel-style grid renders with stable, intentional row ordering  
- The entire system uses a single semantic vocabulary  

This was the most structurally important correction made so far. With the display category system stabilized, we can now safely continue into **Forecast Engine 4.1 (Weekly Aggregation)** and downstream features.

---

# 4. Forecast Engine (Next Major Milestone)

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

1. ✅ **Finish ingestion** (complete)
2. ✅ **Build classification engine** (complete)
3. **Build weekly forecast engine** ← next
4. **Render forecast dashboard (Excel-style)**
5. **Implement category mapping**
6. **Add payment rules for future projections**
7. **Build scenario-planning engine**

## Recent Completions

### Data Ingestion Pipeline
- CSV parser with header normalization
- CSV validator with consistent field mapping
- Transaction mapper with QuickBooks support
- Import service with duplicate detection
- Import API endpoint

### Classification Engine
- GL account-based classification rules
- Keyword-based classification rules
- Historical inference with similarity matching
- ML assist stub (ready for v2)
- Batch processing and reclassification
- Full audit trail with classification_source tracking
- Design mockups for all major views

This is the complete high-level roadmap for the Cash Flow Application.