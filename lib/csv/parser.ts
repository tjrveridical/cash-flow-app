import Papa from "papaparse";
import { RawCSVRow } from "./types";

export class CSVParser {
  parse(csvText: string): { headers: string[]; rows: RawCSVRow[] } {
    const lines = csvText.split("\n");
    const cleanCsv = lines.slice(3).join("\n");

    const result = Papa.parse<RawCSVRow>(cleanCsv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header: string) => header.replace(/^"+|"+$/g, "").trim(),
      transform: (value: string) => value.replace(/^"+|"+$/g, "").trim(),
    });

    const filteredRows = result.data.filter(
      (row) =>
        row["Transaction date"] &&
        row["Amount"] &&
        !row["Distribution account"]?.includes("TOTAL") &&
        !row["Distribution account"]?.includes("Cash Basis") &&
        !row["Distribution account"]?.includes("Unapplied") &&
        !row["Distribution account"]?.includes("Uncategorized")
    );

    return {
      headers: result.meta.fields || [],
      rows: filteredRows,
    };
  }
}