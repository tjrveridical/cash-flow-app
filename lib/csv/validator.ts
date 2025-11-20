import { ImportError, RawCSVRow } from "./types";

export class CSVValidator {
  validateRow(row: RawCSVRow, rowIndex: number): ImportError[] {
    const errors: ImportError[] = [];

    // Required: date
    const dateErr = this.validateRequired(row["date"], "date", rowIndex);
    if (dateErr) errors.push(dateErr);

    // Required: amount
    const amountErr = this.validateRequired(row["amount"], "amount", rowIndex);
    if (amountErr) errors.push(amountErr);

    // Date format
    if (!dateErr) {
      const d = this.validateDate(row["date"], "date", rowIndex);
      if (d) errors.push(d);
    }

    // Amount format
    if (!amountErr) {
      const a = this.validateAmount(row["amount"], "amount", rowIndex);
      if (a) errors.push(a);
    }

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
