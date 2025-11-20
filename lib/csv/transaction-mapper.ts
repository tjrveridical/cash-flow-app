import { RawCSVRow, MappedTransaction } from "./types";

export class TransactionMapper {
  mapRow(row: RawCSVRow): MappedTransaction {
    const date = new Date(row["transaction_date"] ?? "");
    const amount = Number(String(row["amount"]).replace(/[$,]/g, ""));
    const transactionType = String(row["transaction_type"] ?? "").trim();
    const acctNum = String(row["distribution_account"] ?? "").trim();
    const acctName = String(row["account_full_name"] ?? "").trim();
    
    const desc = (
      row["memo_description"] ?? row["name"] ?? ""
    ).trim();

    const sourceId = [
      row["transaction_date"],
      transactionType,
      amount,
      row["name"] || "",
    ].join("|");

    return {
      date,
      amount,
      description: desc,
      transaction_type: transactionType,
      source_system: "quickbooks",
      source_id: sourceId,
      qb_account_number: acctNum,
      qb_account_name: acctName,
      metadata: {}, // Fixed: was just `{}` without being part of the object
    }; // Fixed: missing closing brace and parenthesis
  }
}