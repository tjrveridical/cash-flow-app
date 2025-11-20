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
    const lines = csvText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    const rawHeaders = lines[0].split(",").map(h => h.trim());
    const headers = this.normalizeHeaders(rawHeaders);

    const rows: RawCSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      const row: RawCSVRow = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = parts[j] !== undefined ? parts[j].trim() : null;
      }

      rows.push(row);
    }

    return { headers, rows };
  }
}
