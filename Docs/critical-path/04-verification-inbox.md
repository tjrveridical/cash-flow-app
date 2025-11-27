# 4. Verification Inbox & Manual Review

## Purpose & Scope

The Verification Inbox provides a CFO workflow for reviewing, correcting, and verifying auto-classified transactions before they enter the forecast. This human-in-the-loop quality control ensures forecast accuracy and builds trust in the classification engine.

## Human Workflow 👤

### Review & Verify Transactions

1. **Navigate to Verification Inbox** (`/app/verification`)
   - Page displays all unverified transactions
   - Sorted by date (newest first)
   - Forest green glassmorphic design

2. **Review Transaction Details**
   - **Date:** Transaction date from raw data
   - **Vendor:** Name/description from CSV
   - **Amount:** Color-coded (red negative, green positive)
   - **Classification:** 3-level category chips (Purple/Orange/Blue)
   - **Source:** Classification source badge (Rule/Historical/Manual)

3. **Verify Correct Classifications**
   - Select transactions with checkboxes
   - Click "Verify Selected" in sidebar
   - OR click "Verify" button on individual row
   - OR click "Verify All" in header for bulk verification
   - Verified transactions disappear from inbox

4. **Edit Incorrect Classifications**
   - Click "Edit" button on transaction row
   - EditTransactionModal opens with transaction context
   - Search for correct category using typeahead
   - Select new category from filtered list
   - Click "Save" to update
   - Classification source automatically set to 'manual'

5. **Bulk Operations**
   - Select multiple rows with checkboxes
   - "Bulk Actions" bar appears at bottom
   - "Verify Selected" or "Export Selected" options
   - Clear selections with "Clear" button

### Edge Cases

- **No Unverified Transactions:** Empty state displays "All caught up!"
- **Search/Filter (Future):** Vendor search bar for large inbox
- **Category Not Found:** Searchable combobox shows "No categories found"
- **Verification Error:** Red toast notification with error details
- **Concurrent Edits:** Last write wins (optimistic concurrency)

## Database Schema

### Verification Columns in classified_bank_transactions

```sql
ALTER TABLE classified_bank_transactions
ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN verified_at TIMESTAMPTZ,
ADD COLUMN verified_by TEXT;
```

- **is_verified:** Indicates human review completion
- **verified_at:** Timestamp of verification
- **verified_by:** User identifier (e.g., 'CFO' or user UUID)
- **Partial index:** On `is_verified = false` for fast unverified queries

### Foreign Key Constraint

```sql
ALTER TABLE classified_bank_transactions
ADD CONSTRAINT fk_category_code
FOREIGN KEY (category_code)
REFERENCES display_categories(category_code);
```

**Purpose:** Required by PostgREST for JOIN operations in API queries. Enforces referential integrity at database level.

## API Endpoints

### GET /api/verification/unverified

Fetches unverified transactions with joined category details.

**Query:**
```typescript
.from("classified_bank_transactions")
.select(`
  id, transaction_id, category_code,
  transaction:raw_transactions (
    date, amount, name, description,
    source_system, transaction_type, qb_account_name
  ),
  category:display_categories (
    display_group, display_label, display_label2, cash_direction
  )
`)
.eq("is_verified", false)
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "transaction_id": "uuid",
      "category_code": "labor_payroll",
      "transaction": {
        "date": "2024-11-15",
        "amount": -5432.50,
        "name": "ADP Payroll",
        "description": "Bi-weekly payroll",
        "source_system": "quickbooks",
        "transaction_type": "Check",
        "qb_account_name": "1000 Operating Cash"
      },
      "category": {
        "display_group": "Labor",
        "display_label": "Payroll",
        "display_label2": null,
        "cash_direction": "Cashout"
      }
    }
  ]
}
```

**Notes:**
- PostgREST FK-based joins (no hints needed)
- Sorting moved to JavaScript (PostgREST doesn't support ordering by joined columns)
- Returns 3-level category hierarchy with transaction context

### POST /api/verification/verify

Bulk verify transactions.

**Request:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "count": 3
}
```

**Implementation:**
```typescript
.update({
  is_verified: true,
  verified_at: NOW(),
  verified_by: 'CFO'  // V1: hardcoded; V2: session.user.email
})
.in("id", ids)
```

### GET /api/verification/categories

Fetches all available categories for editing.

**Query:**
```typescript
.from("display_categories")
.select("category_code, display_group, display_label, display_label2")
.not("category_code", "is", null)
.order("display_group", "display_label")
```

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "category_code": "ar_collections",
      "display_group": "AR",
      "display_label": "AR Collections",
      "display_label2": null
    },
    {
      "category_code": "labor_payroll",
      "display_group": "Labor",
      "display_label": "Payroll",
      "display_label2": null
    }
  ]
}
```

**Notes:**
- Filters out null category_codes
- Grouped by display_group
- Sorted alphabetically

### POST /api/verification/edit

Update transaction classification.

**Request:**
```json
{
  "id": "uuid",
  "category_code": "facilities_rent"
}
```

**Response:**
```json
{
  "success": true,
  "classification": {
    "id": "uuid",
    "category_code": "facilities_rent",
    "classification_source": "manual",
    "classified_at": "2024-11-27T10:30:00Z"
  }
}
```

**Implementation:**
```typescript
.update({
  category_code: $category_code,
  classification_source: 'manual',
  classified_at: NOW()
})
.eq("id", $id)
```

## UI Components

### /app/verification/page.tsx

Main verification inbox page.

**Layout:**
- **Header:** Forest green gradient title, Export/Verify All buttons, CFO badge
- **Main Grid:** High-density table with transaction details
- **Stats Sidebar:** Pending count, total amount, needs classification count
- **Bulk Actions:** Appears when rows selected

**Table Features:**
- ✅ Checkbox selection with select all
- ✅ Sort by date (newest first, sorted in JavaScript)
- ✅ Column headers: Date, Vendor, Amount, Classification, Source, Actions
- ✅ Classification chips: Purple (category), Orange (subcategory), Blue (subtype)
- ✅ Color-coded amounts: Red negative, Green positive
- ✅ Row selection: Blue gradient background on selected
- ✅ Hover effects: Light forest green tint

**Design System:**
- **Forest green palette:** `#1e3a1e`, `#2d5a2d`, `#3d6b3d`
- **Glassmorphic effects:** `backdrop-blur(20px-24px)`, semi-transparent white cards
- **Typography:** Font-weight 650 (titles), 580 (vendors), 600 (chips), 550 (buttons)
- **Letter spacing:** -0.014em (body), -0.02em (headings), 0.02em (uppercase)
- **Shadows:** `0 4px 24px rgba(30, 58, 30, 0.04)`
- **Borders:** `rgba(30, 58, 30, 0.08)`

### EditTransactionModal Component

**Technology:** Headless UI Combobox with real-time search

**Design:** Glassmorphic overlay with forest green accents

**Transaction Context Display:**
- Vendor name
- Amount (color-coded)
- Date
- Description

**Searchable Combobox Features:**
- ✅ Type-to-search: Case-insensitive substring matching
- ✅ Filter as you type: Real-time category filtering
- ✅ Keyboard navigation: ↑↓ arrows, Enter to select, Escape to close
- ✅ Display format: "AR > AR Collections" or "COGS > Hardware > Nurse Call"
- ✅ Empty state: "No categories found" when no matches
- ✅ Selected state: Forest green gradient background `#2d5a2d → #3d6b3d`
- ✅ Hover state: Light forest tint `rgba(240, 248, 242, 0.5)`

**Dropdown Styling:**
- **Input border:** `rgba(30, 58, 30, 0.15)`
- **Focus ring:** `3px rgba(45, 90, 45, 0.1)` shadow with `#2d5a2d` border
- **Dropdown background:** White gradient with `blur(20px)` backdrop
- **Typography:** Font-weight 500, letter-spacing -0.01em
- **Options:** Render prop pattern to access active/selected states

**Edit Flow:**
1. User clicks Edit button on transaction row
2. Modal opens with transaction details and current category
3. User types to search categories (e.g., "payroll", "cogs hardware")
4. User selects new category from filtered list
5. Click Save → POST to `/api/verification/edit`
6. On success: Modal closes, transaction list refreshes with new classification
7. Classification source automatically set to 'manual'

**Defensive Filtering:**
- **Database level:** Query excludes `category_code IS NULL`
- **API level:** Logs warnings for null category_codes
- **UI level:** Filters null values before rendering
- **Fallback key:** Uses `index` if null slips through

## Implementation Details

### Verify Button Implementation

#### Individual Verify
- Button on each table row
- `onClick={() => handleVerify(tx.id)}`
- Updates single transaction
- Removes from unverified list immediately

#### Bulk Verify Selected
- Button in sidebar when rows selected
- `onClick={() => handleVerify(Array.from(selectedIds))}`
- Verifies multiple transactions at once
- Clears selection after success

#### Verify All
- Button in header
- `onClick={() => handleVerify(transactions.map(t => t.id))}`
- Verifies entire unverified inbox
- Confirms action before proceeding

#### Behavior
1. POST to `/api/verification/verify` with IDs
2. On success: Clear selections, refresh unverified list
3. Verified transactions disappear from inbox
4. Stats update to reflect new counts

### Data Flow

```
classified_bank_transactions (is_verified = false)
  → GET /api/verification/unverified
    → JOIN display_categories via category_code FK
      → VerificationPage (/app/verification)
        → Table display with Verify/Edit buttons
          → EditTransactionModal (category search/select)
            → POST /api/verification/edit (update classification)
          → Verify button
            → POST /api/verification/verify (mark verified)
              → Transaction removed from inbox
```

### Benefits

1. **Quality Control:** Human review catches ML/rule errors before forecast
2. **Audit Trail:** is_verified flag tracks manual review completion
3. **Bulk Operations:** Efficient CFO workflow with multi-select
4. **Searchable Edit:** Fast category correction with typeahead
5. **Real-time Updates:** Transactions disappear after verification
6. **Clear Status:** Stats sidebar shows pending work at a glance

## Completion Criteria

✅ Verification columns added to classified_bank_transactions
✅ Foreign key constraint on category_code
✅ API endpoints implemented (unverified, verify, edit, categories)
✅ Verification inbox page with forest green design
✅ Verify button with bulk operations
✅ EditTransactionModal with searchable Headless UI Combobox
✅ Real-time search with case-insensitive filtering
✅ Defensive null handling at database, API, and UI levels
✅ Complete CFO workflow for reviewing and correcting classifications
❌ Search/filter by vendor (Section 10.5)
❌ Pagination for large inbox (Section 10.5)
❌ Audit log for all user actions (Section 10.5)

## Related Modules

- [01-database-schema.md](01-database-schema.md) - classified_bank_transactions and display_categories tables
- [03-classification-engine.md](03-classification-engine.md) - Produces classifications for review
- [05-forecast-engine.md](05-forecast-engine.md) - Consumes verified transactions
- [09-multi-user.md](09-multi-user.md) - Real verified_by from auth session
