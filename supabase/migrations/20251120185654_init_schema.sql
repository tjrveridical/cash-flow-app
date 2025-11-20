-- USER ROLES
CREATE TYPE user_role AS ENUM ('ceo', 'cfo', 'accountant', 'viewer');

-- USER PROFILES (linked to Supabase auth)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT now(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- RAW TRANSACTIONS (clean replacement for cash_transactions)
CREATE TABLE public.raw_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  source_system TEXT NOT NULL,     -- 'quickbooks' | 'paylocity' | 'pipedrive'
  source_id TEXT,                  -- ID from source system
  metadata JSONB,                  -- flexible – QB fields, Paylocity fields, etc.
  imported_by UUID REFERENCES public.user_profiles(id),
  imported_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

-- IMPORT HISTORY
CREATE TABLE public.import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  file_name TEXT NOT NULL,
  records_total INT NOT NULL,
  records_imported INT NOT NULL,
  records_failed INT NOT NULL,
  errors JSONB,
  imported_by UUID REFERENCES public.user_profiles(id),
  imported_at TIMESTAMP DEFAULT now()
);