-- Create ledger_edits table for audit trail
CREATE TABLE IF NOT EXISTS ledger_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classified_transaction_id UUID NOT NULL REFERENCES classified_bank_transactions(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  edited_by TEXT NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ledger_edits_transaction_id ON ledger_edits(classified_transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_edits_edited_at ON ledger_edits(edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_edits_edited_by ON ledger_edits(edited_by);

-- Enable RLS
ALTER TABLE ledger_edits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (adjust based on your auth setup)
CREATE POLICY "Allow all operations on ledger_edits" ON ledger_edits
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE ledger_edits IS 'Audit trail for edits made to verified ledger transactions';
COMMENT ON COLUMN ledger_edits.classified_transaction_id IS 'Foreign key to classified_bank_transactions.id';
COMMENT ON COLUMN ledger_edits.field_name IS 'Name of the field that was edited (e.g., vendor, category_code, amount, date)';
COMMENT ON COLUMN ledger_edits.old_value IS 'Previous value before edit';
COMMENT ON COLUMN ledger_edits.new_value IS 'New value after edit';
COMMENT ON COLUMN ledger_edits.reason IS 'Reason for the edit provided by user';
COMMENT ON COLUMN ledger_edits.edited_by IS 'User who made the edit (e.g., CFO, username)';
