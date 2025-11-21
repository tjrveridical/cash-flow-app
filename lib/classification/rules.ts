import { RawTxInput, ClassificationRecord, ClassificationRule } from "./types";

/**
 * Normalize text for comparison
 */
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * GL Account-based classification rules
 */
const GL_RULES: Record<string, string> = {
  // Cash accounts
  "1000": "Cash: Bank of America",
  "1010": "Cash: Bill.com Clearing",
  "1015": "Cash: Divvy",
  "1020": "Cash: Genesis Operating",

  // Labor accounts
  "5000": "Labor: Salary",
  "5100": "Labor: Medical",
  "5200": "Labor: Union",
  "5300": "Labor: Overtime",

  // COGS accounts
  "4000": "COGS: Hardware",
  "4100": "COGS: Software",
  "4200": "COGS: Vendor Services",

  // Opex accounts
  "6000": "Opex: Insurance",
  "6100": "Opex: Utilities",
  "6202": "Opex: Rent",
  "6206": "Opex: Telephone",
  "6300": "Opex: IT Services",
  "6304": "Opex: Bank Fees",

  // Revenue
  "7003": "Revenue: Cash Back Rewards",

  // AR/AP
  "1200": "AR: Accounts Receivable",
  "2010": "AP: Accounts Payable",

  // Prepaid/Other
  "1380": "Other: Prepaid Expenses",
};

/**
 * Keyword-based classification rules
 */
const KEYWORD_RULES: ClassificationRule[] = [
  {
    id: "payroll",
    name: "Payroll Detection",
    priority: 100,
    matcher: (tx) => {
      const desc = normalize(tx.description);
      return desc.includes("payroll") || desc.includes("salary") || desc.includes("adp");
    },
    classifier: () => "Labor: Payroll",
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
    classifier: () => "Opex: Rent",
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
    classifier: () => "Opex: Utilities",
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
        desc.includes("textura")
      );
    },
    classifier: () => "Opex: Bank Fees",
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
      if (tx.amount > 0) return "Revenue: Cash Back Rewards";
      return "Opex: Bank Fees";
    },
  },
];

/**
 * Classify by GL account number
 */
function classifyByGLAccount(tx: RawTxInput): string | null {
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
    return "Labor: Other";
  }
  if (numPrefix === "40" || numPrefix === "41" || numPrefix === "42") {
    return "COGS: Other";
  }
  if (numPrefix === "60" || numPrefix === "61" || numPrefix === "62" || numPrefix === "63") {
    return "Opex: Other";
  }

  return null;
}

/**
 * Classify by GL account name
 */
function classifyByGLAccountName(tx: RawTxInput): string | null {
  if (!tx.qb_account_name) return null;

  const name = normalize(tx.qb_account_name);

  if (name.includes("rent")) return "Opex: Rent";
  if (name.includes("telephone") || name.includes("phone")) return "Opex: Telephone";
  if (name.includes("bank") && name.includes("service")) return "Opex: Bank Fees";
  if (name.includes("payroll") || name.includes("salary")) return "Labor: Payroll";
  if (name.includes("accounts receivable")) return "AR: Accounts Receivable";
  if (name.includes("accounts payable")) return "AP: Accounts Payable";
  if (name.includes("cash back")) return "Revenue: Cash Back Rewards";
  if (name.includes("prepaid")) return "Other: Prepaid Expenses";

  return null;
}

/**
 * Classify by keyword rules
 */
function classifyByKeywords(tx: RawTxInput): string | null {
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
  let classification = classifyByGLAccount(rawTx);
  if (classification) {
    return {
      transactionId: rawTx.id,
      classification,
      classificationSource: "rules",
      notes: `Classified by GL account number: ${rawTx.qb_account_number}`,
    };
  }

  // Try GL account name
  classification = classifyByGLAccountName(rawTx);
  if (classification) {
    return {
      transactionId: rawTx.id,
      classification,
      classificationSource: "rules",
      notes: `Classified by GL account name: ${rawTx.qb_account_name}`,
    };
  }

  // Try keyword rules
  classification = classifyByKeywords(rawTx);
  if (classification) {
    return {
      transactionId: rawTx.id,
      classification,
      classificationSource: "rules",
      notes: `Classified by keyword matching in description`,
    };
  }

  return null;
}
