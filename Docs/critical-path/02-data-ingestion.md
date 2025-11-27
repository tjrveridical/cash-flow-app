# 2. Data Ingestion Pipeline

## Purpose & Scope

The Data Ingestion Pipeline handles importing QuickBooks Transaction Detail CSVs, performing row-level validation, deduplication, and clean insertion into the `raw_transactions` table. This module ensures data quality and provides a user-friendly import experience for authorized users.

## Human Workflow 👤

### CSV Upload & Import

1. **Navigate to Import Page** (`/app/import`)
   - User clicks "Import Transactions" in navigation
   - Page displays forest green glassmorphic file upload card

2. **Select CSV File**
   - Click "Choose File" or drag-and-drop QuickBooks CSV export
   - File must be QuickBooks Transaction Detail format
   - System displays file name and size

3. **Upload & Validation**
   - Click "Upload" button
   - Progress indicator shows processing status
   - System skips report preamble rows
   - Extracts and normalizes header row
   - Validates each row against ingestion rules

4. **Review Validation Errors**
   - If errors found: Amber chips display warnings
   - Error details show: Row number, field name, error reason
   - User can download error report for debugging
   - Options: Fix CSV and re-upload, or continue with valid rows

5. **Import Results**
   - Green toast notification shows success summary
   - Statistics displayed:
     - Total rows processed
     - Successfully imported
     - Duplicates skipped
     - Errors encountered
   - New transactions immediately available for classification

### Edge Cases

- **Duplicate Import:** System detects duplicate `source_id` and skips row
- **Malformed CSV:** Parser handles special characters, trailing commas, empty fields
- **Missing Required Fields:** Validator rejects row with clear error message
- **Invalid Account Numbers:** Only accounts 1000, 1010, 1015, 1020 accepted
- **Excluded Transaction Types:** Transfer and Journal Entry automatically filtered

## Database Schema

### raw_transactions Table

See [01-database-schema.md](01-database-schema.md#raw_transactions-table) for complete schema.

**Key Fields:**
- `source_id` - Dedupe key (unique constraint)
- `qb_account_number` - Filter for accounts 1000, 1010, 1015, 1020
- `transaction_type` - Exclude "Transfer" and "Journal Entry"
- `name` - CSV column E (vendor/name)

### import_history Table

See [01-database-schema.md](01-database-schema.md#import_history-table) for complete schema.

**Tracks:**
- File name and hash (SHA-256 for duplicate detection)
- User who imported
- Row counts (imported, skipped, errors)
- Import duration
- Error log (JSONB)

## API Endpoints

### POST /api/import

Processes CSV upload and imports transactions.

**Request:**
```typescript
Content-Type: multipart/form-data
Body: {
  file: File  // QuickBooks Transaction Detail CSV
}
```

**Response (Success):**
```json
{
  "success": true,
  "result": {
    "totalRows": 150,
    "imported": 142,
    "duplicates": 8,
    "errors": [],
    "duration": 1234
  }
}
```

**Response (Validation Errors):**
```json
{
  "success": false,
  "errors": [
    {
      "row": 15,
      "field": "transaction_date",
      "reason": "Invalid date format"
    },
    {
      "row": 23,
      "field": "distribution_account",
      "reason": "Account must be one of: 1000, 1010, 1015, 1020"
    }
  ]
}
```

## UI Components

### /app/import/page.tsx

Main import page component:
- **Forest green header** with gradient background
- **Glassmorphic file upload card** with drag-and-drop
- **Progress indicators** with forest green color scheme
- **Error display** in amber chips
- **Success summary** in green toast notification
- **Import history table** (optional)

### Design System Match

- **Forest green palette:** `#1e3a1e`, `#2d5a2d`, `#3d6b3d`
- **Glassmorphic effects:** `backdrop-blur(20px)`, semi-transparent white cards
- **Typography:** Font-weight 650 (titles), 550 (buttons)
- **Shadows:** `0 4px 24px rgba(30, 58, 30, 0.04)`

## Implementation Details

### CSV Parser

**File:** `/lib/import/csv-parser.ts`

**Handles:**
- Skipping report preamble rows (non-data header rows)
- Extracting header row
- Normalizing headers into internal keys:
  - `Transaction date` → `transaction_date`
  - `Memo/Description` → `memo_description`
  - Handles special characters and slashes
- Removing trailing summary/footer rows
- Producing structured `RawCSVRow[]`

**Header Normalization Logic:**
```typescript
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\/\s]+/g, '_')  // Replace slashes and spaces with underscores
    .replace(/[^\w_]/g, '');   // Remove special characters
}
```

### CSV Validator

**File:** `/lib/import/csv-validator.ts`

**Enforces Ingestion Rules:**

1. **Required Fields Present:**
   - `distribution_account`
   - `transaction_date`
   - `transaction_type`
   - `amount`

2. **Account Filter:**
   - Account must be one of: `1000`, `1010`, `1015`, `1020`

3. **Transaction Type Filter:**
   - Exclude transaction types: `Transfer`, `Journal Entry`

4. **Data Type Validation:**
   - Validate numeric amount (can be parsed to float)
   - Validate date format (can be parsed to Date)

5. **Unified Normalization:**
   - Uses same `normalizeHeader()` function as parser
   - Ensures consistent field mapping

**Validation Output:**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  row: number;
  field: string;
  reason: string;
}
```

### Transaction Mapper

**File:** `/lib/import/transaction-mapper.ts`

**Maps Validated CSV Rows → Internal Model:**

```typescript
interface MappedTransaction {
  date: Date;
  amount: number;
  description: string;
  name: string;  // CSV column E
  transaction_type: string;
  source_system: 'quickbooks';
  source_id: string;  // Dedupe key (e.g., concatenate date + account + amount)
  qb_account_number: string;
  qb_account_name: string;
  metadata: object;  // Extensible JSON for additional fields
}
```

**Source ID Generation:**
- Concatenates: `${date}_${account}_${amount}_${type}`
- Ensures uniqueness for deduplication
- Handles edge cases (multiple transactions same day/amount)

### Import Service

**File:** `/lib/import/import-service.ts`

**Coordinates Full Ingestion:**

```typescript
async function importCSV(file: File): Promise<CSVImportResult> {
  // 1. Parse CSV → RawCSVRow[]
  const rows = await parseCSV(file);

  // 2. Validate rows → filter valid/invalid
  const { valid, errors } = validateRows(rows);

  // 3. Map valid rows → MappedTransaction[]
  const transactions = mapTransactions(valid);

  // 4. Perform duplicate detection
  const { toInsert, duplicates } = await detectDuplicates(transactions);

  // 5. Insert into raw_transactions (single transaction)
  const result = await bulkInsert(toInsert);

  // 6. Record in import_history
  await logImport(file, result, errors);

  // 7. Return structured result
  return {
    totalRows: rows.length,
    imported: result.count,
    duplicates: duplicates.length,
    errors: errors,
    duration: performance.now() - startTime
  };
}
```

**Transaction Wrapper:**
- All inserts wrapped in single database transaction
- Rollback on error ensures atomicity
- Prevents partial imports

### Recent Improvements

- ✅ Fixed header normalization (`Transaction date` → `transaction_date`)
- ✅ Unified normalization logic between parser and validator
- ✅ Added support for special characters/slashes (`Memo/Description` → `memo_description`)
- ✅ Improved error messages with row numbers and field names
- ✅ Added CSV import safety with file hash duplicate detection (Section 9.5)

## Completion Criteria

✅ CSV parser handles QuickBooks format with preamble/footer skipping
✅ Header normalization consistent across parser and validator
✅ Validator enforces all ingestion rules
✅ Transaction mapper produces clean internal model
✅ Import service coordinates full pipeline
✅ Duplicate detection using source_id
✅ API endpoint POST /api/import functional
✅ Import UI with file upload implemented
❌ Forest green design polish (Section 8.6)
❌ Import history view page (Section 9.6)
❌ File hash duplicate detection (Section 9.5)

## Related Modules

- [01-database-schema.md](01-database-schema.md) - raw_transactions and import_history tables
- [03-classification-engine.md](03-classification-engine.md) - Processes imported transactions
- [09-multi-user.md](09-multi-user.md) - Import safety and audit trail enhancements
