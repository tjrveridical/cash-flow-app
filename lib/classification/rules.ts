import { RawTxInput, ClassificationRecord, ClassificationRule } from "./types";

/**
 * Normalize text for comparison
 */
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * GL Account-based classification rules
 * Maps GL account numbers to category_code and display label
 */
const GL_RULES: Record<string, { categoryCode: string; label: string }> = {
  // Cash accounts - not categorized (handled separately)
  "1000": { categoryCode: "other_other", label: "Cash: Bank of America" },
  "1010": { categoryCode: "other_other", label: "Cash: Bill.com Clearing" },
  "1015": { categoryCode: "other_other", label: "Cash: Divvy" },
  "1020": { categoryCode: "other_other", label: "Cash: Genesis Operating" },

  // Labor accounts
  "5000": { categoryCode: "labor_payroll", label: "Labor: Salary" },
  "5100": { categoryCode: "labor_medical", label: "Labor: Medical" },
  "5200": { categoryCode: "labor_payroll", label: "Labor: Union" },
  "5300": { categoryCode: "labor_payroll", label: "Labor: Overtime" },

  // COGS accounts - generic (without Nurse Call/PXP context)
  "4000": { categoryCode: "cogs_hardware_nurse_call", label: "COGS: Hardware" },
  "4100": { categoryCode: "cogs_software_nurse_call", label: "COGS: Software" },
  "4200": { categoryCode: "cogs_services_nurse_call", label: "COGS: Services" },

  // Facilities accounts
  "6000": { categoryCode: "nl_opex_subscription", label: "Opex: Insurance" },
  "6100": { categoryCode: "facilities_utilities", label: "Opex: Utilities" },
  "6202": { categoryCode: "facilities_rent", label: "Opex: Rent" },
  "6206": { categoryCode: "facilities_telephone", label: "Opex: Telephone" },
  "6300": { categoryCode: "nl_opex_soc_managed_it", label: "Opex: IT Services" },
  "6304": { categoryCode: "nl_opex_bank_service_charges", label: "Opex: Bank Fees" },

  // Revenue
  "7003": { categoryCode: "other_other", label: "Revenue: Cash Back Rewards" },

  // AR/AP
  "1200": { categoryCode: "ar_project", label: "AR: Accounts Receivable" },
  "2010": { categoryCode: "other_other", label: "AP: Accounts Payable" },

  // Prepaid/Other
  "1380": { categoryCode: "other_other", label: "Other: Prepaid Expenses" },
};

/**
 * Keyword-based classification rules
 */
interface KeywordRule {
  id: string;
  name: string;
  priority: number;
  matcher: (tx: RawTxInput) => boolean;
  classifier: (tx: RawTxInput) => { categoryCode: string; label: string };
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    id: "payroll",
    name: "Payroll Detection",
    priority: 100,
    matcher: (tx) => {
      const desc = normalize(tx.description);
      return desc.includes("payroll") || desc.includes("salary") || desc.includes("adp");
    },
    classifier: () => ({ categoryCode: "labor_payroll", label: "Labor: Payroll" }),
  },
  {
    id: "rent",
    name: "Rent Detection",
    priority: 90,
    matcher: (tx) => {
      const desc = normalize(tx.description);
      return (
        desc.includes("rent") ||
        desc.includes("irvine company") ||
        desc.includes("paylease") ||
        desc.includes("princeland")
      );
    },
    classifier: () => ({ categoryCode: "facilities_rent", label: "Opex: Rent" }),
  },
  {
    id: "utilities",
    name: "Utilities Detection",
    priority: 80,
    matcher: (tx) => {
      const desc = normalize(tx.description);
      return (
        desc.includes("verizon") ||
        desc.includes("at&t") ||
        desc.includes("internet") ||
        desc.includes("electricity") ||
        desc.includes("water")
      );
    },
    classifier: () => ({ categoryCode: "facilities_utilities", label: "Opex: Utilities" }),
  },
  {
    id: "bank_fees",
    name: "Bank Fees Detection",
    priority: 85,
    matcher: (tx) => {
      const desc = normalize(tx.description);
      return (
        desc.includes("bank service") ||
        desc.includes("bank fee") ||
        desc.includes("service charge") ||
        desc.includes("monthly fee") ||
        desc.includes("textura") ||
        desc.includes("paymode")
      );
    },
    classifier: () => ({ categoryCode: "nl_opex_bank_service_charges", label: "Opex: Bank Fees" }),
  },
  {
    id: "amex",
    name: "American Express",
    priority: 70,
    matcher: (tx) => {
      const desc = normalize(tx.description);
      return desc.includes("american express") || desc.includes("amex");
    },
    classifier: (tx) => {
      if (tx.amount > 0) return { categoryCode: "other_other", label: "Revenue: Cash Back Rewards" };
      return { categoryCode: "nl_opex_bank_service_charges", label: "Opex: Bank Fees" };
    },
  },
];

/**
 * Classify by GL account number
 */
function classifyByGLAccount(tx: RawTxInput): { categoryCode: string; label: string } | null {
  if (!tx.qb_account_number) return null;

  // Extract the account number (first part before space or the whole string)
  const accountNum = tx.qb_account_number.split(" ")[0];

  // Direct match
  if (GL_RULES[accountNum]) {
    return GL_RULES[accountNum];
  }

  // Prefix match (e.g., 6000-6999 for Opex)
  const numPrefix = accountNum.substring(0, 2);
  if (numPrefix === "50" || numPrefix === "51" || numPrefix === "52" || numPrefix === "53") {
    return { categoryCode: "labor_payroll", label: "Labor: Other" };
  }
  if (numPrefix === "40" || numPrefix === "41" || numPrefix === "42") {
    return { categoryCode: "cogs_services_nurse_call", label: "COGS: Other" };
  }
  if (numPrefix === "60" || numPrefix === "61" || numPrefix === "62" || numPrefix === "63") {
    return { categoryCode: "nl_opex_subscription", label: "Opex: Other" };
  }

  return null;
}

/**
 * Classify by GL account name
 */
function classifyByGLAccountName(tx: RawTxInput): { categoryCode: string; label: string } | null {
  if (!tx.qb_account_name) return null;

  const name = normalize(tx.qb_account_name);

  if (name.includes("rent")) return { categoryCode: "facilities_rent", label: "Opex: Rent" };
  if (name.includes("telephone") || name.includes("phone")) return { categoryCode: "facilities_telephone", label: "Opex: Telephone" };
  if (name.includes("bank") && name.includes("service")) return { categoryCode: "nl_opex_bank_service_charges", label: "Opex: Bank Fees" };
  if (name.includes("payroll") || name.includes("salary")) return { categoryCode: "labor_payroll", label: "Labor: Payroll" };
  if (name.includes("accounts receivable")) return { categoryCode: "ar_project", label: "AR: Accounts Receivable" };
  if (name.includes("accounts payable")) return { categoryCode: "other_other", label: "AP: Accounts Payable" };
  if (name.includes("cash back")) return { categoryCode: "other_other", label: "Revenue: Cash Back Rewards" };
  if (name.includes("prepaid")) return { categoryCode: "other_other", label: "Other: Prepaid Expenses" };

  return null;
}

/**
 * Classify by keyword rules
 */
function classifyByKeywords(tx: RawTxInput): { categoryCode: string; label: string } | null {
  // Sort by priority
  const sortedRules = [...KEYWORD_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (rule.matcher(tx)) {
      return rule.classifier(tx);
    }
  }

  return null;
}

/**
 * Apply all deterministic rules to classify a transaction
 * Returns a ClassificationRecord or null if no rules match
 */
export function applyRules(rawTx: RawTxInput): ClassificationRecord | null {
  // Try GL account number first
  let result = classifyByGLAccount(rawTx);
  if (result) {
    return {
      transactionId: rawTx.id,
      categoryCode: result.categoryCode,
      classification: result.label,
      classificationSource: "rules",
      notes: `Classified by GL account number: ${rawTx.qb_account_number}`,
    };
  }

  // Try GL account name
  result = classifyByGLAccountName(rawTx);
  if (result) {
    return {
      transactionId: rawTx.id,
      categoryCode: result.categoryCode,
      classification: result.label,
      classificationSource: "rules",
      notes: `Classified by GL account name: ${rawTx.qb_account_name}`,
    };
  }

  // Try keyword rules
  result = classifyByKeywords(rawTx);
  if (result) {
    return {
      transactionId: rawTx.id,
      categoryCode: result.categoryCode,
      classification: result.label,
      classificationSource: "rules",
      notes: `Classified by keyword matching in description`,
    };
  }

  return null;
}
