// =====================================================
// Forecast & Validation Types
// =====================================================
// Post-pivot architecture: Payment rules are reusable,
// forecast items generate future payments, raw transactions
// get validated against forecast items.

export type PaymentFrequency =
  | "weekly"
  | "semi-monthly"
  | "monthly"
  | "quarterly"
  | "semi-annual"
  | "annual";

export type ExceptionRule = "move_earlier" | "move_later";

// =====================================================
// Payment Rule (Reusable Rule Library)
// =====================================================

export interface PaymentRule {
  id: string;
  rule_name: string; // e.g., "Monthly_15", "Quarterly_1_Jan"
  frequency: PaymentFrequency;
  anchor_days: number[]; // Structure varies by frequency
  exception_rule: ExceptionRule;
  estimated_amount: number; // Default 0 for library rules
  category_code?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Forecast Item (Vendor + Rule = Future Payments)
// =====================================================

export interface ForecastItem {
  id: string;
  vendor_name: string;
  estimated_amount: number;
  rule_id: string;
  category_code?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForecastItemWithRule extends ForecastItem {
  rule: PaymentRule;
}

// =====================================================
// Forecast Transaction (Generated Future Payment)
// =====================================================

export interface ForecastTransaction {
  id: string;
  forecast_item_id: string;
  payment_date: string; // ISO date string
  amount: number;
  created_at: string;
}

export interface ForecastTransactionWithItem extends ForecastTransaction {
  forecast_item: ForecastItemWithRule;
}

// =====================================================
// Raw Transaction (CSV Upload - Actuals)
// =====================================================

export interface RawTransaction {
  id: string;
  date: string; // ISO date string
  amount: number;
  name?: string | null; // CSV column E
  description?: string | null; // CSV column F (Memo)
  qb_account_name?: string | null; // CSV column H
  qb_account_number?: string | null;
  source_system: string;
  source_id?: string | null;
  transaction_type?: string | null;
  validated: boolean;
  forecast_item_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface RawTransactionWithForecastItem extends RawTransaction {
  forecast_item?: ForecastItemWithRule | null;
}

// =====================================================
// Helper Types for UI
// =====================================================

export interface UnvalidatedTransaction extends RawTransaction {
  validated: false;
  forecast_item_id: null;
}

export interface ValidatedTransaction extends RawTransaction {
  validated: true;
  forecast_item_id: string | null; // null = one-time transaction
}

// =====================================================
// API Request/Response Types
// =====================================================

export interface CreateForecastItemRequest {
  vendor_name: string;
  estimated_amount: number;
  rule_id?: string; // If existing rule
  category_code?: string;
  notes?: string;
  // Inline rule creation (if rule_id not provided)
  frequency?: PaymentFrequency;
  anchor_days?: number[];
  exception_rule?: ExceptionRule;
}

export interface ValidateTransactionRequest {
  forecast_item_id: string;
}

export interface BulkValidateRequest {
  transaction_ids: string[];
}

export interface MarkOneTimeRequest {
  // No additional fields needed - just marks validated=true
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Format payment rule name for display
 * @example "Monthly_15" → "Monthly (15th)"
 * @example "Quarterly_1_Jan" → "Quarterly (Jan 1, Apr 1, Jul 1, Oct 1)"
 * @example "SemiAnnual_Jan15_Jul15" → "Semi-Annual (Jan 15, Jul 15)"
 */
export function formatPaymentRuleName(rule: PaymentRule): string {
  const { frequency, anchor_days } = rule;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  switch (frequency) {
    case "weekly":
      return `Weekly (${dayOfWeek[anchor_days[0]]})`;

    case "semi-monthly":
      return `Semi-Monthly (${ordinal(anchor_days[0])}, ${ordinal(anchor_days[1])})`;

    case "monthly":
      if (anchor_days[0] === 31) {
        return "Monthly (Last Day)";
      }
      return `Monthly (${ordinal(anchor_days[0])})`;

    case "quarterly": {
      const [day, startMonth] = anchor_days;
      const months = [startMonth - 1, startMonth + 2, startMonth + 5, startMonth + 8].map(m => monthNames[m % 12]);
      return `Quarterly (${months.map(m => `${m} ${day}`).join(", ")})`;
    }

    case "semi-annual": {
      const [month1, day1, month2, day2] = anchor_days;
      return `Semi-Annual (${monthNames[month1 - 1]} ${day1}, ${monthNames[month2 - 1]} ${day2})`;
    }

    case "annual": {
      const [month, day] = anchor_days;
      return `Annual (${monthNames[month - 1]} ${day})`;
    }

    default:
      return rule.rule_name;
  }
}

/**
 * Get transaction display details with priority handling
 */
export function getTransactionDisplayDetails(tx: RawTransaction): {
  primary: string;
  secondary: string;
} {
  // Priority: name (column E) > description (column F)
  const primary = tx.name || tx.description || "";
  const secondary = tx.name && tx.description ? tx.description : "";
  return { primary, secondary };
}

/**
 * Format transaction date for display
 */
export function formatTransactionDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

/**
 * Format amount for display (always show negative for outflows)
 */
export function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}
