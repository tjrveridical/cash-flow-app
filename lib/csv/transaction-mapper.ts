import { RawCSVRow, MappedTransaction } from "./types";

export class TransactionMapper {
  mapRow(row: RawCSVRow): MappedTransaction {
    const date = new Date(row["transaction_date"] ?? "");
    const amount = Number(String(row["amount"]).replace(/[$,]/g, ""));
    const transactionType = String(row["transaction_type"] ?? "").trim();
    const acctNum = String(row["distribution_account"] ?? "").trim();
    const acctName = String(row["account_full_name"] ?? "").trim();

    // CSV Column E (Name) - vendor/entity name
    const name = String(row["name"] ?? "").trim();

    // CSV Column F (Memo/Description) - transaction description
    const description = String(row["memo_description"] ?? "").trim();

    const sourceId = [
      row["transaction_date"],
      transactionType,
      amount,
      name,
    ].join("|");

    return {
      date,
      amount,
      name, // CSV Column E
      description, // CSV Column F
      transaction_type: transactionType,
      source_system: "quickbooks",
      source_id: sourceId,
      qb_account_number: acctNum,
      qb_account_name: acctName,
      metadata: {},
    };
  }
}