# Cash Flow App – Critical Path

---

## 1.3 Implement Core Database Schema

### Tables Implemented
- `user_profiles`
- `raw_transactions`
- `bank_accounts`
- `exclusion_rules`
- `classified_bank_transactions`
- `holidays`
- `payment_rules`
- `import_history`

These tables form the foundational data model for ingestion, classification, forecasting, and rule-based automation.

---

## 2. Data Ingestion Pipeline

### 2.1 CSV Parser
Handles:
- Skipping report preamble rows  
- Extracting header row  
- Normalizing headers into internal keys  
- Removing trailing summary/footer rows  
- Producing structured `RawCSVRow[]`

### 2.2 CSV Validator
Enforces ingestion rules:
- Required fields present:
  - `distribution_account`
  - `transaction_date`
  - `transaction_type`
  - `amount`
- Account must be one of: `1000`, `1010`, `1015`, `1020`
- Exclude transaction types: `Transfer`, `Journal Entry`
- Validate numeric amount and valid date

### 2.3 Transaction Mapper
Maps validated CSV rows → internal model:
- `date`
- `amount`
- `description`
- `transaction_type`
- `source_system = "quickbooks"`
- `source_id` (dedupe key)
- `qb_account_number`
- `qb_account_name`
- `metadata` (extensible)

### 2.4 Import Service
Coordinates full ingestion:
- Parse → validate → map  
- Perform duplicate detection  
- Insert into `raw_transactions`  
- Record errors and counts  
- Return a structured `CSVImportResult`

### 2.5 Import UI
User-facing features:
- CSV upload  
- Display progress and validation errors  
- Show import results  
- Accessible to authorized roles

### 2.6 Recent Improvements
- Fixed header normalization (`Transaction date` → `transaction_date`)
- Unified normalization logic between parser and validator
- Added support for special characters/slashes (`Memo/Description` → `memo_description`)

✅ **Milestone:** The ingestion pipeline now imports real QuickBooks Transaction Detail CSVs with row-level validation and clean insertion into `raw_transactions`.

---

## 3. Classification Engine

**Purpose:** Convert raw imported rows into categorized transactions.

### 3.1 Classification Modules Implemented

#### `types.ts`
- `RawTxInput` interface (matches `raw_transactions` schema)
- `ClassificationRecord` for classification results
- `ClassificationRule` for rule definitions

#### `rules.ts` – Deterministic Rules Engine
- **GL Account-based classification**
  - Maps accounts (1000, 1010, 1020, etc.)
  - Handles Labor (5xxx), COGS (4xxx), Opex (6xxx)
  - Supports AR/AP (1200, 2010) and Cash accounts  
- **Keyword-based rules**
  - Payroll, Rent, Utilities, Bank Fees, Rewards  
- **Priority-based weighted matching**

#### `historical.ts` – Historical Inference
- Queries past classifications by GL account  
- Finds similar transactions by 60%+ word overlap  
- Weighted voting; 70%+ consensus required  

#### `mlAssist.ts` – ML Integration Stub
- Placeholder for v2 ML-based classification  

#### `engine.ts` – Main Engine
Decision tree:
1. Skip if manual classification exists  
2. Try deterministic rules  
3. Try historical inference  
4. Try ML suggestion (stub)  
5. Default to “Unclassified”

Batch processing: `classifyBatch(limit)`  
Reclassification: `reclassifyTransaction()`  
System user ID used for automated entries  

### 3.2 Classification Output
Writes to `classified_bank_transactions`:
- `transaction_id` (FK)
- `classification`
- `classification_source`
- `rule_id` (optional)
- `confidence_score` (null v1)
- `notes`
- `classified_at`, `classified_by`

### 3.3 API Endpoint
`POST /api/classification/run`  
Processes unclassified transactions, applies full decision tree, reports summary.

### 3.4 Design Mockups Created
- `verification-inbox.html`
- `master-ledger.html`
- `forecast-spreadsheet.html`
- `payment-rules.html`
- `ar-forecast.html`

✅ **Milestone:** Complete classification engine with deterministic rules, historical inference, ML stubs, and full audit trail.

---

## 3.5 Display Category Hierarchy Architecture (Critical Mid-Build Correction)

### The Problem
When importing real categories (Payroll, Rent, Software, etc.), issues arose:
- **COGS requires 3-level hierarchy:**  
  - `COGS → Hardware → Nurse Call`  
  - `COGS → Software → PXP`
- Expense-card drilldowns more granular (e.g., Mileage → Construction)
- Forecast spreadsheet needs stable top-level categories  
- Duplicate parent rows caused aggregation errors  

### The Key Insight
A single table can support all operations with:
- `scope` for forecast vs card categories  
- `display_label2` for true 3-level hierarchies  
- Stable `category_code`  
- Correct parent rows for each display group  

### What We Did
- Inserted validated parent rows  
- Reparented duplicates and rebuilt hierarchy  
- Rebuilt `sort_order`:
  1. AR → Labor → Facilities → Software → Insurance → Taxes → NL Opex → Expense Card → COGS → Misc  
  2. Alphabetical within group  
  3. Fractional ordering for level 3  
- Cleaned `category_code` values  

### Why It Was Necessary
This ensured:
- Forecast rows align with true business categories  
- Expense-card drilldowns remain granular  
- Reliable classification mapping  
- Stable display and row ordering  
- Unified semantic vocabulary  

✅ **Outcome:** Structural stability achieved; safe to proceed to Forecast Engine (4.1).

---

## 4. Forecast Engine (Next Major Milestone)

### 4.1 Weekly Aggregation
Group classified transactions into week-ending buckets:
- `cash_in`
- `cash_out`
- `net_total`
- `transaction_count`
- `drill-down` rows

### 4.2 Forecast View
Supabase view joins classification + raw transactions, outputs ready-to-render data.

### 4.3 Forecast API
`GET /api/forecast/weeks`  
Returns structured weekly buckets with date filtering.

---

## 5. Forecast Dashboard (Excel-Style Grid)

### 5.1 UI Structure
- **Rows:** Categories (Payroll, Rent, COGS, etc.)  
- **Columns:** Week ending dates  
- **Cells:** Dollar values (net/inflow/outflow)  
- **Modal:** Transaction drill-downs  

### 5.2 Features
- Frozen header column  
- Horizontal scroll  
- Event-driven updates  
- Snapshot system for “as-of” reporting  

---

## 6. Payment Rules & Recurring Outflows (Phase 3)

### 6.1 Rule Types
- Payroll cycles  
- Rent schedules  
- Subscriptions  
- Insurance  
- Car/allowance  
- Taxes  
- Loan/lease schedules  

### 6.2 Payment Rule Engine
Generates synthetic future transactions using:
- `anchor_day`, `anchor_type`, `frequency`
- Business-day adjustment
- Conditional logic

### 6.3 Integration With Forecast
Future-dated items appear in weekly buckets alongside historical data.

---

## 7. AR Estimation Module (Phase 4)

### 7.1 Features
- Manual AR forecast inputs (4-week rolling)
- Integrated with forecast dashboard  
- v1: Manual inputs  
- v3/v4: Automated pull from hazard functions app  

---

## 8. Future Enhancements

### 8.1 Scenario Planning
- **Employee Cost Engine:** fully burdened cost  
- **Scenarios:** hiring, termination, cost-change, budget vs actual  
- **“Can We Afford This Hire?”** – instant runway impact  

### 8.2 Export Capabilities
- Excel export  
- PDF reports  
- API export  

---

## ✅ Summary Critical Path
- [x] Finish ingestion (complete)  
- [x] Build classification engine (complete)  
- [ ] Build weekly forecast engine ← **next**  
- [ ] Render forecast dashboard (Excel-style)  
- [ ] Implement payment rules  
- [ ] Add AR estimation module  

---

## 🟢 Recent Completions

### Data Ingestion Pipeline
- CSV parser with header normalization  
- CSV validator with consistent mapping  
- Transaction mapper (QuickBooks support)  
- Import service with duplicate detection  
- Import API endpoint  

### Classification Engine
- GL + Keyword-based classification  
- Historical inference  
- ML assist stub (ready for v2)  
- Batch reclassification  
- Full audit trail  
- Design mockups  

---

**This is the complete high-level roadmap for the Cash Flow Application.**