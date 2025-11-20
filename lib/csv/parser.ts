import Papa from "papaparse";
import { RawCSVRow } from "./types";

export class CSVParser {
  private normalizeHeader(header: string): string {
    return header
      .replace(/^"+|"+$/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/\//g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  parse(csvText: string): { headers: string[]; rows: RawCSVRow[] } {
    const lines = csvText.split("\n");
    const cleanCsv = lines.slice(3).join("\n");

    const result = Papa.parse<RawCSVRow>(cleanCsv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header: string) => this.normalizeHeader(header),
      transform: (value: string) => value.replace(/^"+|"+$/g, "").trim(),
    });

    const filteredRows = result.data.filter(
      (row) =>
        row["transaction_date"] &&
        row["amount"] &&
        !row["distribution_account"]?.includes("TOTAL") &&
        !row["distribution_account"]?.includes("Cash Basis") &&
        !row["distribution_account"]?.includes("Unapplied") &&
        !row["distribution_account"]?.includes("Uncategorized")
    );

    return {
      headers: result.meta.fields || [],
      rows: filteredRows,
    };
  }
}