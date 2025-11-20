import Papa from "papaparse";
import { RawCSVRow } from "./types";

export class CSVParser {
  parse(csvText: string): { headers: string[]; rows: RawCSVRow[] } {
    // Skip QuickBooks header lines (first 3: title, date range, empty)
    const lines = csvText.split("\n");
    const cleanCsv = lines.slice(3).join("\n");

    const result = Papa.parse(cleanCsv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      quoteChar: '"',
      escapeChar: '"',
      transform: (value: string) => value.replace(/^"+|"+$/g, "").trim(), // Extra quote stripping
    });

    const headers = result.meta.fields || [];

    const rows = result.data as RawCSVRow[];

    // Filter out footer/invalid rows
    const filteredRows = rows.filter(
      (row) =>
        row["Transaction date"] &&
        row["Amount"] &&
        !row["Distribution account"]?.startsWith("TOTAL") &&
        !row["Distribution account"]?.startsWith("Cash Basis") &&
        !row["Distribution account"]?.includes("Unapplied") &&
        !row["Distribution account"]?.includes("Uncategorized")
    );

    return { headers, rows: filteredRows };
  }
}