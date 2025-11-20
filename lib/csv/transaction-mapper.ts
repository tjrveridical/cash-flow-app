import { RawCSVRow, ParsedTransaction, SourceSystem } from "./types";

export class TransactionMapper {
  mapRow(row: RawCSVRow, sourceSystem: SourceSystem): ParsedTransaction {
    // Normalize date
    const rawDate = String(row["date"] || "").trim();
    const parsedDate = new Date(rawDate);
    const isoDate = isNaN(parsedDate.getTime())
      ? ""
      : parsedDate.toISOString().split("T")[0];

    // Normalize amount
    const rawAmount = String(row["amount"] || "").replace(/[$,]/g, "");
    const amount = Number(rawAmount) || 0;

    // Extract QB fields if present
    const qbAccountNumber = (row["account"] || row["account number"] || row["qb account number"] || "") as string;
    const qbAccountName = (row["account name"] || row["qb account name"] || "") as string;

    // Generic description
    const description =
      (row["description"] as string) ||
      (row["memo"] as string) ||
      "";

    return {
      date: isoDate,
      amount,
      description,
      transaction_type: (row["type"] as string) || "",
      source_system: sourceSystem,
      source_id: (row["doc number"] as string) || "",
      qb_account_number: qbAccountNumber.trim(),
      qb_account_name: qbAccountName.trim(),
      metadata: { ...row }
    };
  }
}
