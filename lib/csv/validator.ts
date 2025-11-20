import { ImportError, RawCSVRow } from "./types";

export class CSVValidator {
  private normalizeKey(key: string): string {
    return key.trim().toLowerCase().replace(/\s+/g, "_");
  }

  private get(row: RawCSVRow, field: string): string | undefined {
    const normalizedField = this.normalizeKey(field);
    for (const key in row) {
      if (this.normalizeKey(key) === normalizedField) {
        return String(row[key] ?? "").trim().replace(/^"+|"+$/g, "");
      }
    }
    return undefined;
  }

  validateRow(row: RawCSVRow, rowIndex: number): ImportError[] {
    const errors: ImportError[] = [];

    const required = ["Distribution account", "Transaction date", "Transaction type", "Amount"];
    for (const f of required) {
      const val = this.get(row, f);
      if (!val) {
        errors.push({ row: rowIndex, field: f, message: `${f} is required` });
      }
    }
    if (errors.length > 0) return errors;

    const acctStr = this.get(row, "Distribution account")!;
    const acctNum = acctStr.split(" ")[0];
    if (!["1000", "1010", "1015", "1020"].includes(acctNum)) {
      errors.push({
        row: rowIndex,
        field: "Distribution account",
        message: "Account is not a permitted cash account",
      });
    }

    const ttype = this.get(row, "Transaction type")!;
    if (ttype === "Transfer" || ttype === "Journal Entry") {
      errors.push({
        row: rowIndex,
        field: "Transaction type",
        message: "Transaction type is excluded",
      });
    }

    const dateVal = this.get(row, "Transaction date");
    const parsed = new Date(dateVal!);
    if (isNaN(parsed.getTime())) {
      errors.push({
        row: rowIndex,
        field: "Transaction date",
        message: "Invalid date format",
      });
    }

    const amountStr = this.get(row, "Amount")!.replace(/[$,]/g, "");
    if (isNaN(Number(amountStr))) {
      errors.push({
        row: rowIndex,
        field: "Amount",
        message: "Invalid amount format",
      });
    }

    return errors;
  }
}