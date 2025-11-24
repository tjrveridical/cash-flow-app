import { CSVParser } from "@/lib/csv/parser";
import { CSVValidator } from "@/lib/csv/validator";
import { TransactionMapper } from "@/lib/csv/transaction-mapper";
import { CSVImportResult, ImportError, SourceSystem } from "@/lib/csv/types";
import { MappedTransaction } from "@/lib/csv/types";
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
      result.errors.push({ row: 0, message: "CSV contains no data" });
      return result;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const errors = this.validator.validateRow(row, i + 1);
      if (errors.length > 0) {
        result.recordsFailed++;
        result.errors.push(...errors);
        continue;
      }

      const mapped: MappedTransaction = this.mapper.mapRow(row);

      const { data: existing } = await this.supabase
        .from("raw_transactions")
        .select("id")
        .eq("source_id", mapped.source_id)
        .limit(1);

      if (existing && existing.length > 0) {
        result.duplicates++;
        continue;
      }

      const safeDate =
        mapped.date instanceof Date && !isNaN(mapped.date.getTime())
          ? mapped.date.toISOString()
          : null;

      const { error } = await this.supabase.from("raw_transactions").insert({
        date: safeDate,
        amount: mapped.amount,
        name: mapped.name, // CSV Column E
        description: mapped.description, // CSV Column F
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

    result.success = result.recordsFailed === 0;
    return result;
  }
}