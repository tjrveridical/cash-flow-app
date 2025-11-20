import { ImportError, RawCSVRow } from "./types";

export class CSVValidator {
  // Normalize header names: "Distribution account" → "distribution_account"
  private normalizeKey(key: string): string {
    return key.toLowerCase().trim().replace(/\s+/g, "_");
  }

  validateRow(row: RawCSVRow, rowIndex: number): ImportError[] {
    const errors: ImportError[] = [];

    // Map normalized keys to actual values
    const get = (field: string): any => {
      const normalized = this.normalizeKey(field);
      for (const key in row) {
        if (this.normalizeKey(key) === normalized) {
          return row[key];
        }
      }
      return undefined;
    };

    // Required fields (using display names)
    const requiredFields = ["Distribution account", "Transaction date", "Transaction type", "Amount"];
    for (const f of requiredFields) {
      const value = get(f);
      if (value === undefined || value === null || value === "") {
        errors.push({
          row: rowIndex,
          field: f,
          message: `${f} is required`,
        });
      }
    }

    if (errors.length > 0) return errors;

    const acct = String(get("Distribution account") || "").trim().split(" ")[0]; // e.g., "1000 Bank of America" → "1000"
    if (!["1000", "1010", "1015", "1020"].includes(acct)) {
      errors.push({
        row: rowIndex,
        field: "Distribution account",
        value: acct,
        message: "Account is not a permitted cash account",
      });
    }

    const ttype = String(get("Transaction type") || "").trim();
    if (ttype === "Transfer" || ttype === "Journal Entry") {
      errors.push({
        row: rowIndex,
        field: "Transaction type",
        value: ttype,
        message: "Transaction type is excluded",
      });
    }

    const dateVal = get("Transaction date");
    const parsed = new Date(dateVal);
    if (isNaN(parsed.getTime())) {
      errors.push({
        row: rowIndex,
        field: "Transaction date",
        value: dateVal,
        message: "Invalid date format",
      });
    }

    const amountVal = String(get("Amount") || "").replace(/[$,]/g, "");
    if (isNaN(Number(amountVal))) {
      errors.push({
        row: rowIndex,
        field: "Amount",
        value: get("Amount"),
        message: "Invalid amount format",
      });
    }

    return errors;
  }
}