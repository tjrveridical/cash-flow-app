import { ImportError, RawCSVRow } from "./types";

export class CSVValidator {
  validateRow(row: RawCSVRow, rowIndex: number): ImportError[] {
    const errors: ImportError[] = [];

    // Required fields
    const requiredFields = ["distribution_account", "transaction_date", "transaction_type", "amount"];
    for (const f of requiredFields) {
      const err = this.validateRequired(row[f], f, rowIndex);
      if (err) errors.push(err);
    }

    // If required fields missing, return now
    if (errors.length > 0) return errors;

    // Allowed bank accounts
    const allowedAccounts = ["1000", "1010", "1015", "1020"];
    const acct = String(row["distribution_account"]).trim();
    if (!allowedAccounts.includes(acct)) {
      errors.push({
        row: rowIndex,
        field: "distribution_account",
        value: acct,
        message: "Account is not a permitted cash account"
      });
    }

    // Excluded transaction types
    const ttype = String(row["transaction_type"]).trim();
    if (ttype === "Transfer" || ttype === "Journal Entry") {
      errors.push({
        row: rowIndex,
        field: "transaction_type",
        value: ttype,
        message: "Transaction type is excluded"
      });
    }

    // Validate date
    const d = this.validateDate(row["transaction_date"], "transaction_date", rowIndex);
    if (d) errors.push(d);

    // Validate amount
    const a = this.validateAmount(row["amount"], "amount", rowIndex);
    if (a) errors.push(a);

    return errors;
  }

  validateRequired(value: any, field: string, rowIndex: number): ImportError | null {
    if (value === undefined || value === null || value === "") {
      return {
        row: rowIndex,
        field,
        value,
        message: `${field} is required`
      };
    }
    return null;
  }

  validateDate(value: any, field: string, rowIndex: number): ImportError | null {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      return {
        row: rowIndex,
        field,
        value,
        message: `Invalid date format`
      };
    }
    return null;
  }

  validateAmount(value: any, field: string, rowIndex: number): ImportError | null {
    const cleaned = String(value).replace(/[$,]/g, "");
    const num = Number(cleaned);

    if (isNaN(num)) {
      return {
        row: rowIndex,
        field,
        value,
        message: `Invalid amount format`
      };
    }

    return null;
  }
}
