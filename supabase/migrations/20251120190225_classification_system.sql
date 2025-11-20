-- ============================
-- BANK ACCOUNTS
-- ============================
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gl_code TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ONLY the bank accounts you approved
INSERT INTO public.bank_accounts (gl_code, account_name)
VALUES 
  ('1000', 'Bank of America'),
  ('1015', 'Genesis Reserve'),
  ('1020', 'Genesis Operating');

-- ============================
-- EXCLUSION RULES
-- ============================
-- These rules drive auto-exclusion before classification.

CREATE TABLE public.exclusion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL,    -- 'transaction_type', 'description_pattern'
  operator TEXT NOT NULL,     -- 'equals', 'contains', 'starts_with', 'ends_with', 'regex'
  value TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Exclude ALL Transfer transactions
INSERT INTO public.exclusion_rules (rule_type, operator, value, description, priority)
VALUES
  ('transaction_type', 'equals', 'Transfer',
   'Auto-exclude all Transfer transactions', 1);

-- Exclude ALL Journal Entries (new rule)
INSERT INTO public.exclusion_rules (rule_type, operator, value, description, priority)
VALUES
  ('transaction_type', 'equals', 'Journal Entry',
   'Auto-exclude ALL Journal Entries — they are not cash movement', 2);

-- ============================
-- CLASSIFIED BANK TRANSACTIONS
-- ============================
-- This stores the final classification for each raw transaction.

CREATE TABLE public.classified_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.raw_transactions(id),
  classification TEXT NOT NULL,        -- cash_in | cash_out | exclude
  classification_source TEXT NOT NULL, -- auto_exclusion_rule | auto_amount_based
  rule_id UUID REFERENCES public.exclusion_rules(id),
  confidence_score DECIMAL(5,2),
  notes TEXT,
  classified_at TIMESTAMP DEFAULT now(),
  classified_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================
-- HELPER FUNCTIONS
-- ============================

CREATE OR REPLACE FUNCTION public.is_bank_account(gl TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bank_accounts
    WHERE gl_code = gl AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_active_bank_gl_codes()
RETURNS TEXT[] AS $$
BEGIN
  RETURN (SELECT array_agg(gl_code)
          FROM public.bank_accounts
          WHERE is_active = true);
END;
$$ LANGUAGE plpgsql;