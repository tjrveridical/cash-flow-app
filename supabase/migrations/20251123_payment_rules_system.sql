-- Add name field to raw_transactions for CSV column E (Name)
ALTER TABLE public.raw_transactions
ADD COLUMN IF NOT EXISTS name TEXT;

-- Create frequency enum for payment rules
CREATE TYPE payment_frequency AS ENUM (
  'weekly',
  'semi-monthly',
  'monthly',
  'quarterly',
  'semi-annual',
  'annual'
);

-- Create exception rule enum for business day adjustments
CREATE TYPE exception_rule AS ENUM (
  'move_earlier',
  'move_later'
);

-- VENDORS table (separate from payment rules for cleaner data model)
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- PAYMENT RULES table
CREATE TABLE public.payment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  frequency payment_frequency NOT NULL,
  anchor_days JSONB NOT NULL, -- Array of numbers: [5] for weekly, [1,15] for semi-monthly, [1,7] for semi-annual
  exception_rule exception_rule NOT NULL DEFAULT 'move_later',
  estimated_amount NUMERIC NOT NULL,
  category_code TEXT REFERENCES public.display_categories(category_code),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT unique_vendor_rule UNIQUE(vendor_id)
);

-- VENDOR RULE ASSIGNMENTS table (tracks which transactions are assigned to which vendor/rule)
CREATE TABLE public.vendor_rule_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.raw_transactions(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  payment_rule_id UUID REFERENCES public.payment_rules(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT now(),
  assigned_by UUID REFERENCES public.user_profiles(id),
  CONSTRAINT unique_transaction_assignment UNIQUE(transaction_id)
);

-- Indexes for performance
CREATE INDEX idx_vendors_name ON public.vendors(name);
CREATE INDEX idx_payment_rules_vendor_id ON public.payment_rules(vendor_id);
CREATE INDEX idx_payment_rules_frequency ON public.payment_rules(frequency);
CREATE INDEX idx_vendor_assignments_transaction_id ON public.vendor_rule_assignments(transaction_id);
CREATE INDEX idx_vendor_assignments_vendor_id ON public.vendor_rule_assignments(vendor_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_rules_updated_at BEFORE UPDATE ON public.payment_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_rule_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read all
CREATE POLICY "Allow authenticated users to read vendors"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read payment rules"
  ON public.payment_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read vendor assignments"
  ON public.vendor_rule_assignments FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies: Allow CFO/CEO to insert/update/delete
CREATE POLICY "Allow CFO/CEO to insert vendors"
  ON public.vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to update vendors"
  ON public.vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to delete vendors"
  ON public.vendors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to insert payment rules"
  ON public.payment_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to update payment rules"
  ON public.payment_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to delete payment rules"
  ON public.payment_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to insert vendor assignments"
  ON public.vendor_rule_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to update vendor assignments"
  ON public.vendor_rule_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

CREATE POLICY "Allow CFO/CEO to delete vendor assignments"
  ON public.vendor_rule_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );
