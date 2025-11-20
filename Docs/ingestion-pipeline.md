# Data Ingestion Pipeline

This document defines how external data enters the system and becomes verified truth.

Pipeline:
raw file → raw_transactions → normalized_transactions → verification inbox → ledger_transactions

---

# 1. Raw Import

**Endpoint:** POST /api/raw/import

Accepted sources:
- Bank CSV (Genesis, BofA)
- QuickBooks CSV
- Bill.com exports
- Divvy exports

Metadata stored:
- source
- file hash
- import_batch_id
- user_id
- timestamp

---

# 2. Deduplication

Before inserting into raw_transactions, rows are checked for duplicates:

Duplicate definition:
- same source  
- same date  
- same amount  
- same transaction number OR memo similarity (>80%)  
- same or earlier batch

Duplicates skipped + logged.

---

# 3. Insert into raw_transactions (Immutable)

One row per raw input row.  
No edits or deletes.

---

# 4. Normalize → normalized_transactions

Each raw row is transformed to a clean, consistent structure.

Normalization performs:
- vendor normalization  
- vendor matching (auto-create vendor if new)  
- transaction_type inference  
- date normalization  
- direction correction (inflow/outflow)  
- transaction_number extraction  
- category suggestion (hierarchy inference)  
- source tagging

normalized_transactions = system interpretation before human verification.

---

# 5. Verification Inbox (View)

A virtual view:

normalized_transactions  
LEFT JOIN ledger_transactions  
WHERE ledger.id IS NULL

Provides:
- unverified transactions only  
- suggested category  
- vendor  
- type  
- source  
- date  
- amount  

User can:
- reclassify  
- verify  
- open raw drawer  

---

# 6. Verify → ledger_transactions (Truth Table)

Verification performs:
- Insert ledger row with final category)
- Lock classification  
- Assign verified_by  
- Remove from inbox  
- Trigger forecast regeneration  
- Write audit_log entry  

---

# 7. Unverify (CFO Only)

Reverse of above:
- Delete ledger row  
- Restore to inbox  
- Log action in audit_log  

---

# 8. Impact on Calendar Forecast

After ingestion + verification:

1. Actuals replace forecast placeholders  
2. Vendors without rules flagged “no rule”  
3. Payment rule changes cause forward re-generation  
4. AR manual forecast is layered on top

---

# Reliability Guarantees

- No duplicates  
- Full traceability  
- Every number explainable through raw → normalized → ledger chain  
- Immutable raw layer  
- Deterministic normalization  
- Human-in-the-loop before truth  
- CFO-controlled timing and classification  
- Perfect auditability  