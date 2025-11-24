export type PaymentFrequency =
  | "weekly"
  | "semi-monthly"
  | "monthly"
  | "quarterly"
  | "semi-annual"
  | "annual";

export type ExceptionRule = "move_earlier" | "move_later";

export interface Vendor {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRule {
  id: string;
  vendor_id: string;
  frequency: PaymentFrequency;
  anchor_days: number[]; // e.g., [5] for weekly Friday, [1,15] for semi-monthly, [1,7] for semi-annual
  exception_rule: ExceptionRule;
  estimated_amount: number;
  category_code?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRuleWithVendor extends PaymentRule {
  vendor: Vendor;
}

export interface VendorRuleAssignment {
  id: string;
  transaction_id: string;
  vendor_id: string;
  payment_rule_id?: string | null;
  assigned_at: string;
  assigned_by?: string | null;
}

export interface VendorRuleAssignmentWithDetails extends VendorRuleAssignment {
  vendor: Vendor;
  payment_rule?: PaymentRule | null;
}

export interface UnassignedTransaction {
  id: string;
  date: string; // CSV column B (Transaction Date)
  amount: number;
  name?: string | null; // CSV column E
  description?: string | null; // CSV column F
  qb_account_name?: string | null; // CSV column H (Account Full Name)
  source_system: string;
}

// API Request/Response types
export interface CreateVendorRequest {
  name: string;
}

export interface CreatePaymentRuleRequest {
  vendor_id: string;
  frequency: PaymentFrequency;
  anchor_days: number[];
  exception_rule: ExceptionRule;
  estimated_amount: number;
  category_code?: string | null;
  notes?: string | null;
}

export interface UpdatePaymentRuleRequest extends Partial<CreatePaymentRuleRequest> {
  id: string;
}

export interface CreateVendorAssignmentRequest {
  transaction_id: string;
  vendor_id: string;
  payment_rule_id?: string | null;
}

// Helper type for displaying frequency in UI
export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  weekly: "Weekly",
  "semi-monthly": "Semi-monthly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "semi-annual": "Semi-annual",
  annual: "Annual",
};

// Helper function for ordinal numbers
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Helper constant for month names
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Helper function to format frequency with anchor days
export function formatPaymentSchedule(rule: PaymentRule): string {
  const { frequency, anchor_days } = rule;

  switch (frequency) {
    case "weekly":
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `Weekly (${dayNames[anchor_days[0]]})`;

    case "semi-monthly":
      return `Semi-monthly (${anchor_days.join(", ")})`;

    case "monthly":
      return `Monthly (${ordinal(anchor_days[0])})`;

    case "quarterly":
      return `Quarterly (${ordinal(anchor_days[0])})`;

    case "semi-annual":
      if (anchor_days.length === 2) {
        // [1, 15] means month numbers
        return `Semi-annual (${monthNames[anchor_days[0] - 1]} ${ordinal(anchor_days[1])}, ${monthNames[anchor_days[0] + 5]} ${ordinal(anchor_days[1])})`;
      }
      return "Semi-annual";

    case "annual":
      if (anchor_days.length === 2) {
        // [12, 1] means Dec 1st
        const month = monthNames[anchor_days[0] - 1];
        return `Annual (${month} ${ordinal(anchor_days[1])})`;
      }
      return "Annual";

    default:
      return FREQUENCY_LABELS[frequency];
  }
}
