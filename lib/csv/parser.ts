import { RawCSVRow, SourceSystem } from "./types";

export class CSVParser {
  detectSourceSystem(headers: string[]): SourceSystem | null {
    const h = headers.map(x => x.toLowerCase());

    if (h.includes("date") && h.includes("amount")) {
      return "quickbooks";
    }
    if (h.includes("pay date")) {
      return "paylocity";
    }
    if (h.includes("deal value") || h.includes("close date")) {
      return "pipedrive";
    }

    return null;
  }

  normalizeHeaders(headers: string[]): string[] {
    return headers.map(h =>
      h.trim().toLowerCase().replace(/\s+/g, " ")
    );
  }

  parse(csvText: string): { headers: string[]; rows: RawCSVRow[] } {
    const rawLines = csvText.split(/\r?\n/);

    if (rawLines.length < 5) {
      return { headers: [], rows: [] };
    }

    // Skip first 3 rows
    const headerLine = rawLines[3];
    const rawHeaders = headerLine.split(",").map(h => h.trim());
    const headers = this.normalizeHeaders(rawHeaders);

    const rows: RawCSVRow[] = [];

    // Process rows starting at line 4 (index 4) through second-to-last real row
    for (let i = 4; i < rawLines.length; i++) {
      const line = rawLines[i];

      if (!line || line.trim() === "") continue;

      const firstCol = line.split(",")[0].trim();

      if (firstCol.toLowerCase() === "total") continue;
      if (firstCol.toLowerCase().includes("cash basis")) continue;
      if (firstCol.toLowerCase().includes("accrual basis")) continue;

      const parts = line.split(",");

      const row: RawCSVRow = {};
      for (let j = 0; j < headers.length; j++) {
        const val = parts[j] !== undefined ? parts[j].trim() : null;
        row[headers[j]] = val;
      }

      rows.push(row);
    }

    return { headers, rows };
  }
}
