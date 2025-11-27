# 1. Database Schema

## Purpose & Scope

This module documents the complete database schema for the Cash Flow Application, including all tables, columns, indexes, foreign key relationships, and migrations. The schema serves as the foundation for data ingestion, classification, forecasting, and multi-user management.

## Database Schema

### Tables Implemented

Core tables forming the foundational data model:

- **`user_profiles`** - User accounts and role management
- **`raw_transactions`** - Imported transaction data from QuickBooks
- **`bank_accounts`** - Bank account definitions
- **`exclusion_rules`** - Rules for filtering unwanted transactions
- **`classified_bank_transactions`** - Auto-classified transactions with verification status
- **`holidays`** - Business holiday calendar for payment rule adjustments
- **`payment_rules`** - Recurring payment schedule templates (pure date calculations)
- **`import_history`** - CSV import audit trail
- **`display_categories`** - Hierarchical category structure for forecast display
- **`cash_balances`** - Manual CFO entries for starting cash positions
- **`ar_forecast_entries`** - Manual AR payment predictions
- **`forecast_items`** - Future forecast items linking rules to vendor/amount/category
- **`forecast_transactions`** - Generated forecast transactions with variance tracking

### raw_transactions Table

```sql
CREATE TABLE raw_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  name TEXT,  -- CSV column E (Name/Vendor)
  transaction_type TEXT NOT NULL,
  source_system TEXT DEFAULT 'quickbooks',
  source_id TEXT,  -- Dedupe key
  qb_account_number TEXT,
  qb_account_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_transactions_date ON raw_transactions(date);
CREATE INDEX idx_raw_transactions_source_id ON raw_transactions(source_id);
CREATE INDEX idx_raw_transactions_qb_account ON raw_transactions(qb_account_name);
```

**Purpose:** Stores all imported transaction data from QuickBooks CSV exports with full audit trail.

### classified_bank_transactions Table

```sql
CREATE TABLE classified_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES raw_transactions(id) ON DELETE CASCADE,
  category_code TEXT NOT NULL,  -- FK to display_categories
  classification TEXT,  -- Deprecated; kept for debugging
  classification_source TEXT NOT NULL,  -- 'rule', 'historical', 'manual'
  rule_id UUID,  -- Optional reference to classification rule
  confidence_score NUMERIC,  -- Null in v1
  notes TEXT,
  classified_at TIMESTAMPTZ DEFAULT NOW(),
  classified_by TEXT,  -- User ID or 'system'
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classified_transactions_category ON classified_bank_transactions(category_code);
CREATE INDEX idx_classified_transactions_verified ON classified_bank_transactions(is_verified) WHERE is_verified = false;

ALTER TABLE classified_bank_transactions
ADD CONSTRAINT fk_category_code
FOREIGN KEY (category_code)
REFERENCES display_categories(category_code);
```

**Purpose:** Stores auto-classified transactions with verification workflow support.

### display_categories Table

```sql
CREATE TABLE display_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT UNIQUE NOT NULL,
  scope TEXT NOT NULL,  -- 'forecast' or 'expense_card'
  display_group TEXT NOT NULL,  -- AR, Labor, COGS, Facilities, etc.
  display_label TEXT NOT NULL,  -- Subcategory label
  display_label2 TEXT,  -- Optional 3rd level for COGS/Expense Card
  cash_direction TEXT CHECK (cash_direction IN ('Cashin', 'Cashout')),
  sort_order NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_display_categories_code ON display_categories(category_code);
CREATE INDEX idx_display_categories_scope ON display_categories(scope);
CREATE INDEX idx_display_categories_sort ON display_categories(sort_order);
```

**Purpose:** Hierarchical category structure supporting 3-level drilldowns for forecast display and expense cards. Includes stable `category_code` values and CFO-friendly sort ordering.

**Sort Order Priority:**
1. AR → Labor → Facilities → Software → Insurance → Taxes → NL Opex → Expense Card → COGS → Misc
2. Alphabetical within group
3. Fractional ordering for level 3

### cash_balances Table

```sql
CREATE TABLE cash_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  balance NUMERIC NOT NULL,
  notes TEXT,
  entered_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bank_account, as_of_date)
);

CREATE INDEX idx_cash_balances_date ON cash_balances(as_of_date);
```

**Purpose:** Manual CFO entry of starting cash positions used as "Beginning Cash" in forecast grid. V1: Single manual entry. V2: Automated reconciliation.

### payment_rules Table (New - Paydate Rules)

```sql
CREATE TABLE payment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT UNIQUE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('Weekly', 'SemiMonthly', 'Monthly', 'Quarterly', 'SemiAnnual', 'Annually')),
  anchor_day TEXT NOT NULL,  -- Can be 1-31 as string, "EOM", or "Mon", "Tue", etc for weekly
  anchor_day2 INT,  -- Nullable, only for SemiMonthly and SemiAnnual
  months TEXT,  -- Nullable, comma-separated like "3,6,9,12" or "4,10" or "2"
  business_day_adjustment TEXT NOT NULL DEFAULT 'next' CHECK (business_day_adjustment IN ('next', 'previous')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_rules_rule_name ON payment_rules(rule_name);
CREATE INDEX idx_payment_rules_frequency ON payment_rules(frequency);
```

**Purpose:** Pure date calculation templates (NO vendors, NO amounts, NO categories). Reusable templates that forecast_items will reference.

**Bootstrap Rules:** Migration seeds 25 production rules (5 Annual, 15 Monthly, 2 Quarterly, 1 SemiAnnual, 1 SemiMonthly, 1 Weekly).

### ar_forecast_entries Table

```sql
CREATE TABLE ar_forecast_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  invoice_number TEXT,
  expected_amount NUMERIC NOT NULL,
  expected_date DATE NOT NULL,
  confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
  confidence_multiplier NUMERIC DEFAULT 1.0,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ar_forecast_date ON ar_forecast_entries(expected_date);
```

**Purpose:** Manual 4-week rolling AR forecast with confidence-weighted amounts for "AR Collections" inflow projections.

### holidays Table

```sql
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  holiday_name TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_holidays_date ON holidays(holiday_date);
```

**Purpose:** Business holiday calendar for payment rule adjustments. Used to skip weekends/holidays when generating forecast dates.

### import_history Table

```sql
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_hash TEXT,  -- SHA-256 for duplicate detection
  imported_by UUID REFERENCES user_profiles(id),
  rows_imported INT,
  rows_skipped INT,
  import_duration_ms INT,
  error_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_history_file_hash ON import_history(file_hash);
CREATE INDEX idx_import_history_user ON import_history(imported_by);
```

**Purpose:** CSV import audit trail with duplicate detection and performance tracking.

## Implementation Details

### Migration Files

All migrations located in `/supabase/migrations/`:

- `20251120185654_init_schema.sql` - Initial schema setup
- `20251120190225_classification_system.sql` - Classification tables
- `20251120191048_forecast_view.sql` - Forecast view
- `20251120193426_display_categories.sql` - Display categories table
- `20251121_cleanup_display_categories.sql` - Category hierarchy fixes
- `20251121222800_add_category_code_and_cash_balances.sql` - Forecast engine updates
- `20251123_payment_rules_system.sql` - Old payment rules schema
- `20251123_fix_payment_rules_schema.sql` - Schema redundancy fixes
- `20251123_pivot_to_forecast_items.sql` - Forecast items pivot
- `20251123_seed_holidays.sql` - Holiday calendar seed
- `20251124_fix_transaction_and_category_schema.sql` - Transaction schema updates
- `20251125150229_add_verification_columns.sql` - Verification workflow
- `20251125152500_add_category_foreign_key.sql` - FK constraint
- `20251127_create_payment_rules.sql` - New paydate rules schema

### Database Diagram

Consider creating a visual database diagram using dbdiagram.io or similar tool for documentation purposes.

## Completion Criteria

✅ Core tables implemented (raw_transactions, classified_bank_transactions, display_categories)
✅ Verification columns added to classified_bank_transactions
✅ Foreign key constraint on category_code
✅ cash_balances table created
✅ payment_rules table created (pure date templates)
✅ ar_forecast_entries table created
✅ All indexes created for performance
✅ Import history tracking implemented
✅ Holiday calendar seeded
❌ Multi-user tables (user_profiles roles, audit_log) - Section 9
❌ Scenario modeling tables - Section 11
❌ Database diagram documentation

## Related Modules

- [02-data-ingestion.md](02-data-ingestion.md) - Uses raw_transactions and import_history tables
- [03-classification-engine.md](03-classification-engine.md) - Writes to classified_bank_transactions
- [04-verification-inbox.md](04-verification-inbox.md) - Reads/updates classified_bank_transactions
- [05-forecast-engine.md](05-forecast-engine.md) - Joins across all forecast tables
- [07-payment-rules.md](07-payment-rules.md) - Manages payment_rules table
- [08-ar-estimation.md](08-ar-estimation.md) - Manages ar_forecast_entries table
