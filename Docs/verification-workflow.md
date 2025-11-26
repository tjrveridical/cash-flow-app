# Verification Workflow Specification

The verification workflow is the human-in-the-loop gate where CFO/Controller/Sr Accountant reviews auto-classified transactions before they become authoritative truth.

---

## Purpose

Transform unverified classified transactions into verified ledger entries that drive forecasts and financial reporting.

---

## Core Principles

1. **Human verification required** - No transaction enters ledger without approval
2. **Edit before verify** - Classifications can be corrected before approval
3. **Bulk operations supported** - Verify multiple transactions at once
4. **Audit trail preserved** - Who verified what when
5. **Zero data loss** - Raw transactions immutable forever

---

## Input

**Source**: `classified_bank_transactions` table

**Filter**: `is_verified = false`

**Includes**:
- Transaction metadata (date, vendor, amount, source)
- Auto-classification (category_code, classification_source = 'auto')
- Foreign key to immutable raw_transactions

---

## Output

**Target**: Same `classified_bank_transactions` table

**Updates**:
- `is_verified = true`
- `verified_at = NOW()`
- `verified_by = [session.user.email]`
- `classification_source = 'manual'` (if edited)
- `category_code = [new_code]` (if edited)

---

## User Actions

### 1. Review Transaction
- View vendor, amount, date, source
- See auto-suggested classification (purple/orange/blue chips)
- Hover for classification hierarchy tooltip

### 2. Edit Classification
- Click "Edit" button
- Search/typeahead dropdown (Headless UI Combobox)
- Select from grouped categories (AR, Labor, COGS, Facilities, NL Opex, Other)
- Format: "COGS > Hardware > Nurse Call"
- Save updates category_code + sets classification_source = 'manual'

### 3. Verify Transaction
- Click "Verify" button (single)
- Or select multiple + "Bulk Verify" button
- Transaction moves from inbox to master ledger
- Refreshes unverified count

### 4. View Master Ledger
- Navigate to /ledger page (separate view)
- See all verified transactions
- Audit trail: verified_by, verified_at
- Drill-down to raw transaction data

---

## Database Schema

**Tables Used**:
- `classified_bank_transactions` (primary)
- `raw_transactions` (immutable reference via FK)
- `display_categories` (lookup for edit modal)

**Key Columns**:
```sql
classified_bank_transactions:
  - is_verified BOOLEAN DEFAULT false
  - verified_at TIMESTAMP
  - verified_by TEXT
  - classification_source TEXT ('auto' | 'manual')
  - category_code TEXT (FK to display_categories)
```

---

## UI Routes

- `/verification` - Verification inbox (main workflow)
- `/ledger` - Master ledger (verified transactions view)

**Components**:
- `page.tsx` - Inbox table with stats
- `EditTransactionModal.tsx` - Searchable category picker
- API: `/api/verification/unverified` (GET)
- API: `/api/verification/verify` (POST)
- API: `/api/verification/edit` (POST)
- API: `/api/verification/categories` (GET)

---

## Design System

**Visual Style**: Forest green theme with glassmorphic effects
- Header: `linear-gradient(135deg, #1e3a1e 0%, #2d5a2d 40%, #3d6b3d 100%)`
- Stat cards: `backdrop-filter: blur(20px)`, 3px gradient top bar
- Classification chips: Purple (category), Orange (subcategory), Blue (subtype)
- Table: Excel-like density, sticky header, hover effects

**Typography**:
- Font: SF Pro Display, Inter, system-ui
- Weights: 650 (titles), 600 (chips), 580 (vendor), 550 (buttons)
- Letter spacing: -0.014em (body), -0.02em (headings)

---

## Workflow Boundaries

### ✅ This Workflow DOES:
- Display unverified transactions
- Allow classification editing
- Move transactions to verified state
- Track who verified when
- Provide master ledger view

### ❌ This Workflow DOES NOT:
- Create payment rules
- Generate forecasts
- Calculate AR projections
- Import CSV files (handled by ingestion)
- Delete transactions
- Modify raw_transactions (immutable)
- Auto-classify (handled by classification engine)

---

## State Transitions

```
raw_transactions (immutable)
  ↓
classified_bank_transactions (is_verified = false)
  ↓ [VERIFICATION WORKFLOW]
classified_bank_transactions (is_verified = true)
  ↓
Used by Forecast Engine
```

---

## Success Criteria

- Inbox processable to zero daily
- Edit modal search finds categories in <1 second
- Bulk verify 50+ transactions without error
- Verified_by tracks real user (not hardcoded 'CFO')
- Master ledger paginated beyond 500 transactions
