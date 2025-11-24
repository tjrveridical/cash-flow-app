export type SourceSystem = "quickbooks" | "paylocity" | "pipedrive";

export interface RawCSVRow {
  [key: string]: string | undefined;
}

export type MappedTransaction = {
  date: Date;
  amount: number;
  name: string; // CSV Column E (Name)
  description: string; // CSV Column F (Memo/Description)
  transaction_type: string;
  source_system: SourceSystem;
  source_id: string;
  qb_account_number: string;
  qb_account_name: string;
  metadata: Record<string, any>;
};

export interface ParsedTransaction {
  date: string;
  amount: number;
  description?: string;
  transaction_type?: string;
  source_system: SourceSystem;
  source_id?: string;
  qb_account_number?: string;
  qb_account_name?: string;
  metadata?: Record<string, any>;
}

export interface CSVImportResult {
  success: boolean;
  totalRows: number;
  recordsImported: number;
  recordsFailed: number;
  duplicates: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  message: string;
  field?: string;
  value?: any;
}