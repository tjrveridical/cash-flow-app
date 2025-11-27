# 3. Classification Engine

## Purpose & Scope

The Classification Engine converts raw imported transactions into categorized transactions by applying a decision tree of deterministic rules, historical inference, and ML suggestions (v2). The engine writes to `classified_bank_transactions` with full audit trail of classification source and confidence.

## Database Schema

### classified_bank_transactions Table

See [01-database-schema.md](01-database-schema.md#classified_bank_transactions-table) for complete schema.

**Key Fields:**
- `category_code` - FK to display_categories.category_code
- `classification_source` - 'rule', 'historical', 'manual'
- `classification` - Deprecated; kept for debugging
- `confidence_score` - Null in v1
- `is_verified` - Verification workflow flag

### display_categories Table

See [01-database-schema.md](01-database-schema.md#display_categories-table) for complete schema.

**3-Level Hierarchy:**
- `display_group` - Top level (AR, Labor, COGS, Facilities, etc.)
- `display_label` - Second level (Payroll, Rent, Software, etc.)
- `display_label2` - Third level (optional, for COGS and Expense Card)

## API Endpoints

### POST /api/classification/run

Processes unclassified transactions with full decision tree.

**Request:**
```json
{
  "limit": 100  // Optional, process up to N unclassified transactions
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 100,
    "classified": 85,
    "unclassified": 15,
    "bySource": {
      "rule": 60,
      "historical": 25,
      "ml": 0
    }
  }
}
```

## UI Components

### Design Mockups Created

**File:** `/Docs/mockups/`

- `verification-inbox.html` - CFO review workflow
- `master-ledger.html` - Transaction history view
- `forecast-spreadsheet.html` - 26-week forecast grid
- `payment-rules.html` - Recurring payment management
- `ar-forecast.html` - Manual AR estimation

## Implementation Details

### Classification Modules

#### types.ts

**File:** `/lib/classification/types.ts`

```typescript
interface RawTxInput {
  id: string;
  date: Date;
  amount: number;
  description: string;
  name: string;
  transaction_type: string;
  qb_account_number: string;
  qb_account_name: string;
}

interface ClassificationRecord {
  transaction_id: string;
  category_code: string;
  classification_source: 'rule' | 'historical' | 'ml' | 'manual';
  rule_id?: string;
  confidence_score?: number;
  notes?: string;
}

interface ClassificationRule {
  id: string;
  name: string;
  categoryCode: string;
  priority: number;
  matcher: (tx: RawTxInput) => boolean;
}
```

#### rules.ts – Deterministic Rules Engine

**File:** `/lib/classification/rules.ts`

**GL Account-Based Classification:**
- Maps GL accounts to specific category codes
- Handles Labor (5xxx), COGS (4xxx), Opex (6xxx)
- Supports AR/AP (1200, 2010) and Cash accounts (1000, 1010, 1015, 1020)

**Example Rules:**
```typescript
const glAccountRules: ClassificationRule[] = [
  {
    id: 'labor_payroll',
    name: 'Payroll',
    categoryCode: 'labor_payroll',
    priority: 10,
    matcher: (tx) => tx.qb_account_number.startsWith('5')
  },
  {
    id: 'facilities_rent',
    name: 'Rent',
    categoryCode: 'facilities_rent',
    priority: 10,
    matcher: (tx) => tx.description.toLowerCase().includes('rent')
  }
];
```

**Keyword-Based Rules:**
- Payroll keywords: "ADP", "payroll", "salary", "wages"
- Rent keywords: "rent", "landlord", "lease"
- Utilities keywords: "electric", "gas", "water", "internet"
- Bank Fees keywords: "fee", "charge", "overdraft"
- Rewards keywords: "reward", "points", "cashback"

**Priority-Based Weighted Matching:**
- Higher priority rules checked first
- First matching rule wins
- Confidence score based on match strength

#### historical.ts – Historical Inference

**File:** `/lib/classification/historical.ts`

**Algorithm:**

1. **Query Past Classifications by GL Account**
   ```sql
   SELECT category_code, COUNT(*) as freq
   FROM classified_bank_transactions cbt
   JOIN raw_transactions rt ON cbt.transaction_id = rt.id
   WHERE rt.qb_account_name = $account
     AND cbt.is_verified = true
   GROUP BY category_code
   ORDER BY freq DESC;
   ```

2. **Find Similar Transactions by Word Overlap**
   - Tokenize description into words
   - Calculate Jaccard similarity: `intersection / union`
   - Require 60%+ word overlap for match

3. **Weighted Voting**
   - Count category votes from similar transactions
   - Require 70%+ consensus for classification
   - Return most common category if consensus reached

**Example:**
```typescript
async function inferFromHistory(tx: RawTxInput): Promise<ClassificationRecord | null> {
  // 1. Find transactions with same GL account
  const similar = await findSimilarTransactions(tx);

  // 2. Calculate word overlap for each
  const matches = similar.filter(s => calculateOverlap(tx.description, s.description) >= 0.6);

  // 3. Weighted voting
  const votes = countVotes(matches);
  const consensus = votes[0].count / matches.length;

  if (consensus >= 0.7) {
    return {
      transaction_id: tx.id,
      category_code: votes[0].category_code,
      classification_source: 'historical',
      confidence_score: consensus
    };
  }

  return null;
}
```

#### mlAssist.ts – ML Integration Stub

**File:** `/lib/classification/mlAssist.ts`

**Purpose:** Placeholder for v2 ML-based classification.

**Current Implementation:**
```typescript
async function suggestCategory(tx: RawTxInput): Promise<ClassificationRecord | null> {
  // V2: Call ML model API
  // Return suggested category with confidence score
  return null;
}
```

**Future Integration:**
- Train custom model on verified transactions
- Use embeddings for semantic similarity
- Return top 3 suggestions with confidence scores
- Learn from user corrections

#### engine.ts – Main Classification Engine

**File:** `/lib/classification/engine.ts`

**Decision Tree:**

```typescript
async function classifyTransaction(tx: RawTxInput): Promise<ClassificationRecord> {
  // 1. Skip if manual classification exists
  const existing = await getExistingClassification(tx.id);
  if (existing?.classification_source === 'manual') {
    return existing;
  }

  // 2. Try deterministic rules
  const ruleResult = await applyRules(tx);
  if (ruleResult) {
    return ruleResult;
  }

  // 3. Try historical inference
  const historicalResult = await inferFromHistory(tx);
  if (historicalResult) {
    return historicalResult;
  }

  // 4. Try ML suggestion (v2)
  const mlResult = await suggestCategory(tx);
  if (mlResult && mlResult.confidence_score >= 0.8) {
    return mlResult;
  }

  // 5. Default to "Unclassified"
  return {
    transaction_id: tx.id,
    category_code: 'other_other',
    classification_source: 'rule',
    notes: 'No matching rule or historical data'
  };
}
```

**Batch Processing:**
```typescript
async function classifyBatch(limit: number = 100): Promise<ClassificationSummary> {
  // 1. Fetch unclassified transactions
  const transactions = await getUnclassifiedTransactions(limit);

  // 2. Classify each transaction
  const results = await Promise.all(transactions.map(classifyTransaction));

  // 3. Insert into classified_bank_transactions
  await bulkInsert(results);

  // 4. Return summary
  return summarizeResults(results);
}
```

**Reclassification:**
```typescript
async function reclassifyTransaction(txId: string): Promise<ClassificationRecord> {
  // 1. Fetch transaction
  const tx = await getTransaction(txId);

  // 2. Delete existing classification
  await deleteClassification(txId);

  // 3. Reclassify
  return classifyTransaction(tx);
}
```

**System User ID:**
- All automated classifications use `classified_by = 'system'`
- Manual corrections use actual user ID

### Display Category Hierarchy (Section 3.5)

#### The Problem

When importing real categories (Payroll, Rent, Software, etc.), issues arose:
- **COGS requires 3-level hierarchy:** `COGS → Hardware → Nurse Call`, `COGS → Software → PXP`
- Expense-card drilldowns more granular (e.g., `Mileage → Construction`)
- Forecast spreadsheet needs stable top-level categories
- Duplicate parent rows caused aggregation errors

#### The Key Insight

A single table can support all operations with:
- `scope` for forecast vs card categories
- `display_label2` for true 3-level hierarchies
- Stable `category_code`
- Correct parent rows for each display group

#### What We Did

- Inserted validated parent rows
- Reparented duplicates and rebuilt hierarchy
- Rebuilt `sort_order`:
  1. AR → Labor → Facilities → Software → Insurance → Taxes → NL Opex → Expense Card → COGS → Misc
  2. Alphabetical within group
  3. Fractional ordering for level 3
- Cleaned `category_code` values

#### Why It Was Necessary

This ensured:
- Forecast rows align with true business categories
- Expense-card drilldowns remain granular
- Reliable classification mapping
- Stable display and row ordering
- Unified semantic vocabulary

## Completion Criteria

✅ Classification types defined (types.ts)
✅ Deterministic rules engine (rules.ts)
✅ Historical inference with similarity matching (historical.ts)
✅ ML assist stub for v2 (mlAssist.ts)
✅ Main classification engine with decision tree (engine.ts)
✅ Batch processing and reclassification
✅ Full audit trail with classification_source tracking
✅ Display category hierarchy fixed
✅ API endpoint POST /api/classification/run
✅ Design mockups for all major views
❌ ML model training and integration (v2)
❌ Confidence score tuning (v2)
❌ User feedback loop for model improvement (v2)

## Related Modules

- [01-database-schema.md](01-database-schema.md) - classified_bank_transactions and display_categories tables
- [02-data-ingestion.md](02-data-ingestion.md) - Provides raw_transactions for classification
- [04-verification-inbox.md](04-verification-inbox.md) - Manual review and correction of classifications
- [05-forecast-engine.md](05-forecast-engine.md) - Consumes classified transactions for forecast
