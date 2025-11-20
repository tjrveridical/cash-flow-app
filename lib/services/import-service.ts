import { CSVParser } from "@/lib/csv/parser";
import { CSVValidator } from "@/lib/csv/validator";
import { TransactionMapper } from "@/lib/csv/transaction-mapper";
import { CSVImportResult, ImportError, ParsedTransaction, SourceSystem } from "@/lib/csv/types";
import { createClient } from "@supabase/supabase-js";

export class ImportService {
  private supabase;
  private parser = new CSVParser();
  private validator = new CSVValidator();
  private mapper = new TransactionMapper();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async import(csvText: string, sourceSystem: SourceSystem): Promise<CSVImportResult> {
    const { headers, rows } = this.parser.parse(csvText);

    const result: CSVImportResult = {
      success: true,
      totalRows: rows.length,
      recordsImported: 0,
      recordsFailed: 0,
      duplicates: 0,
      errors: [],
    };

    if (rows.length === 0) {
      result.success = false;
      result.errors.push({
        row: 0,
        message: "CSV contains no data",
      });
      return result;
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Validate row
      const errors = this.validator.validateRow(row, i + 1);
      if (errors.length > 0) {
        result.recordsFailed++;
        result.errors.push(...errors);
        continue;
      }

      // Map row -> ParsedTransaction
      const mapped: ParsedTransaction = this.mapper.mapRow(row, sourceSystem);

      // Insert into DB
      const { error } = await this.supabase.from("raw_transactions").insert({
        date: mapped.date,
        amount: mapped.amount,
        description: mapped.description,
        transaction_type: mapped.transaction_type,
        source_system: mapped.source_system,
        source_id: mapped.source_id,
        qb_account_number: mapped.qb_account_number,
        qb_account_name: mapped.qb_account_name,
        metadata: mapped.metadata,
      });

      if (error) {
        result.recordsFailed++;
        result.errors.push({
          row: i + 1,
          message: error.message,
        });
        continue;
      }

      result.recordsImported++;
    }

    return result;
  }
}
