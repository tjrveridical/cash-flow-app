-- Payment Rules Table (Date Calculation Templates)
-- NO vendors, NO amounts, NO categories - PURE date templates only
-- These are reusable templates that forecast_items will reference

CREATE TABLE payment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT UNIQUE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('Weekly', 'SemiMonthly', 'Monthly', 'Quarterly', 'SemiAnnual', 'Annually')),
  anchor_day TEXT NOT NULL, -- Can be 1-31 as string, "EOM", or "Mon", "Tue", etc for weekly
  anchor_day2 INT, -- Nullable, only for SemiMonthly and SemiAnnual
  months TEXT, -- Nullable, comma-separated like "3,6,9,12" or "4,10" or "2"
  business_day_adjustment TEXT NOT NULL DEFAULT 'next' CHECK (business_day_adjustment IN ('next', 'previous')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on rule_name for fast lookups (used by forecast_items foreign key)
CREATE INDEX idx_payment_rules_rule_name ON payment_rules(rule_name);

-- Index on frequency for filtering and stats
CREATE INDEX idx_payment_rules_frequency ON payment_rules(frequency);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_payment_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_rules_updated_at
    BEFORE UPDATE ON payment_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_rules_updated_at();

-- Seed 25 Bootstrap Rules (Production Data)
-- These rules are immediately available for forecast items to reference

-- Annual Rules (5)
INSERT INTO payment_rules (rule_name, frequency, anchor_day, anchor_day2, months, business_day_adjustment) VALUES
('Annually_01_Jun', 'Annually', '1', NULL, '6', 'next'),
('Annually_02_Feb', 'Annually', '2', NULL, '2', 'next'),
('Annually_20_Oct', 'Annually', '20', NULL, '10', 'next'),
('Annually_23_May', 'Annually', '23', NULL, '5', 'next'),
('Annually_27_Feb', 'Annually', '27', NULL, '2', 'next');

-- Monthly Rules (15)
INSERT INTO payment_rules (rule_name, frequency, anchor_day, anchor_day2, months, business_day_adjustment) VALUES
('Monthly_01', 'Monthly', '1', NULL, NULL, 'next'),
('Monthly_02', 'Monthly', '2', NULL, NULL, 'next'),
('Monthly_05', 'Monthly', '5', NULL, NULL, 'next'),
('Monthly_07', 'Monthly', '7', NULL, NULL, 'next'),
('Monthly_08', 'Monthly', '8', NULL, NULL, 'next'),
('Monthly_11', 'Monthly', '11', NULL, NULL, 'next'),
('Monthly_15', 'Monthly', '15', NULL, NULL, 'next'),
('Monthly_17', 'Monthly', '17', NULL, NULL, 'next'),
('Monthly_18', 'Monthly', '18', NULL, NULL, 'next'),
('Monthly_20', 'Monthly', '20', NULL, NULL, 'next'),
('Monthly_21', 'Monthly', '21', NULL, NULL, 'next'),
('Monthly_23', 'Monthly', '23', NULL, NULL, 'next'),
('Monthly_29', 'Monthly', '29', NULL, NULL, 'next'),
('Monthly_30', 'Monthly', '30', NULL, NULL, 'next'),
('Monthly_EOM', 'Monthly', 'EOM', NULL, NULL, 'previous');

-- Quarterly Rules (2)
INSERT INTO payment_rules (rule_name, frequency, anchor_day, anchor_day2, months, business_day_adjustment) VALUES
('Quarterly_01_Jan', 'Quarterly', '1', NULL, '1,4,7,10', 'next'),
('Quarterly_15_Mar', 'Quarterly', '15', NULL, '3,6,9,12', 'next');

-- SemiAnnual Rule (1)
INSERT INTO payment_rules (rule_name, frequency, anchor_day, anchor_day2, months, business_day_adjustment) VALUES
('SemiAnnual_30Apr_31Oct', 'SemiAnnual', '30', 31, '4,10', 'previous');

-- SemiMonthly Rule (1)
INSERT INTO payment_rules (rule_name, frequency, anchor_day, anchor_day2, months, business_day_adjustment) VALUES
('SemiMonthly_5_17', 'SemiMonthly', '5', 17, NULL, 'next');

-- Weekly Rule (1)
INSERT INTO payment_rules (rule_name, frequency, anchor_day, anchor_day2, months, business_day_adjustment) VALUES
('Weekly_Mon', 'Weekly', 'Mon', NULL, NULL, 'next');

-- Verify seed success
DO $$
DECLARE
  rule_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rule_count FROM payment_rules;
  RAISE NOTICE 'Payment rules seeded successfully. Total rules: %', rule_count;

  IF rule_count != 25 THEN
    RAISE EXCEPTION 'Expected 25 rules but found %', rule_count;
  END IF;
END $$;
