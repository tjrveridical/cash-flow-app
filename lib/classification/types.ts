export interface RawTxInput {
  id: string;
  date: Date | string;
  amount: number;
  description: string;
  source_system: string;
  source_id: string;
  metadata: Record<string, any>;
  transaction_type?: string;
  qb_account_number?: string;
  qb_account_name?: string;
}

export interface ClassificationRecord {
  transactionId: string;
  categoryCode: string; // Primary: matches display_categories.category_code
  classification: string; // Deprecated: kept for debug only
  classificationSource: "rules" | "history" | "ml_assist" | "manual" | "imported";
  ruleId?: string;
  notes?: string;
}

export interface ClassificationRule {
  id: string;
  name: string;
  priority: number;
  matcher: (tx: RawTxInput) => boolean;
  classifier: (tx: RawTxInput) => string;
}
