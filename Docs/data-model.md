# Data Model Specification

This document defines the complete relational data model for the Cash Flow Application.

The system uses a **four-layer truth pipeline**:

1. raw_transactions  
2. normalized_transactions  
3. ledger_transactions  
4. forecast calendar (computed)

And several supporting tables.

---

# 1. raw_transactions (Immutable Ground Truth)

All data ingested from external sources goes here.

## Columns
- id (PK)
- source (enum: bank, qbo, billcom, divvy)
- raw_date (date)
- raw_amount (numeric)
- raw_vendor (text)
- raw_memo (text)
- raw_type (text)
- raw_transaction_number (text)
- import_batch_id (uuid)
- created_at (timestamp)

## Rules
- Never updated or deleted.
- Duplicate detection occurs before insert.
- All downstream tables refer back to raw row via FK.

---

# 2. normalized_transactions (System Interpretation)

Each raw row maps to exactly one normalized row.

## Columns
- id (PK)
- raw_id (FK → raw_transactions.id)
- date (date)
- amount (numeric)
- vendor_id (FK → vendors.id)
- transaction_type (enum)
- transaction_number (text)
- source (enum)
- inferred_category_id (FK → categories.id)
- inferred_subcategory_id (FK → subcategories.id)
- inferred_subtype_id (FK → subtypes.id, nullable)
- created_at (timestamp)

## Purpose
- Apply vendor matching.
- Normalize transaction type.
- Infer suggested category path.
- Feed the Verification Inbox.

---

# 3. ledger_transactions (Final CFO-Grade Truth)

Created only after a transaction is verified.

## Columns
- id (PK)
- normalized_id (FK → normalized_transactions.id)
- date
- amount
- vendor_id
- category_id
- subcategory_id
- subtype_id (nullable)
- verified_by (FK → users)
- verified_at (timestamp)
- source
- transaction_number
- is_deferred (bool)
- deferred_reason (text)
- created_at
- updated_at

## Rules
- Immutable except for CFO unverify action.
- Represents authoritative truth for all dashboards and forecasts.

---

# 4. vendors

Normalized vendor dictionary.

## Columns
- id (PK)
- name (text)
- default_category_id (FK → categories.id)
- created_at
- updated_at

---

# 5. categories (Top-Level)

Four top-level buckets:
- Labor
- COGS
- Opex
- Other

## Columns
- id (PK)
- name
- color
- created_at

---

# 6. subcategories (Second Level)

Examples:
- Labor → Salary, Medical, Union, Overtime
- COGS → Hardware, Software, Vendor Services
- Opex → Insurance, Rent, Utilities, IT Services

## Columns
- id (PK)
- category_id (FK)
- name
- created_at

---

# 7. subtypes (Third Level — COGS Only)

Examples:
- Hardware → Nurse Call Hardware, LiNK Hardware
- Software → Nurse Call Software, LiNK Software

## Columns
- id (PK)
- subcategory_id (FK)
- name
- created_at

---

# 8. payment_rules

Defines how future cash is predicted.

## Columns
- id (PK)
- applies_to (enum: vendor, category)
- vendor_id (nullable)
- category_id (nullable)
- frequency (enum)
- anchor_day (int or enum)
- business_day_adjustment (enum: next, previous, none)
- notes
- created_by
- created_at
- updated_at

---

# 9. ar_forecast_manual

Manual CFO entry of 4-week AR inflows.

## Columns
- id
- week_start_date
- cash_in_expected
- created_by
- created_at

---

# 10. audit_log

Immutable record of all state-changing actions.

## Columns
- id
- user_id
- action_type
- object_type
- object_id
- old_value (jsonb)
- new_value (jsonb)
- timestamp

---

# Summary

This data model ensures:
- Full traceability
- Deterministic forecasting
- World-class audit quality
- Zero ambiguity in classification
- Perfect integration between UI, forecast engine, and CFO reporting