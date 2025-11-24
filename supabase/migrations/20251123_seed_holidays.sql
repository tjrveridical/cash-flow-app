-- =====================================================
-- Create Holidays Table and Seed with US Federal Holidays
-- =====================================================
-- This table is used by the forecast generation engine to
-- adjust payment dates that fall on holidays

-- =====================================================
-- STEP 1: Create holidays table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  holiday_name TEXT NOT NULL,
  is_business_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(holiday_date);

-- RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read holidays"
  ON public.holidays FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow CFO/CEO to insert holidays"
  ON public.holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('cfo', 'ceo')
    )
  );

-- =====================================================
-- STEP 2: Seed US Federal Holidays 2024-2026
-- =====================================================

-- 2024 Holidays
INSERT INTO public.holidays (holiday_date, holiday_name) VALUES
  ('2024-01-01', 'New Year''s Day'),
  ('2024-01-15', 'Martin Luther King Jr. Day'),
  ('2024-02-19', 'Presidents'' Day'),
  ('2024-05-27', 'Memorial Day'),
  ('2024-06-19', 'Juneteenth'),
  ('2024-07-04', 'Independence Day'),
  ('2024-09-02', 'Labor Day'),
  ('2024-10-14', 'Columbus Day'),
  ('2024-11-11', 'Veterans Day'),
  ('2024-11-28', 'Thanksgiving Day'),
  ('2024-12-25', 'Christmas Day')
ON CONFLICT (holiday_date) DO NOTHING;

-- 2025 Holidays
INSERT INTO public.holidays (holiday_date, holiday_name) VALUES
  ('2025-01-01', 'New Year''s Day'),
  ('2025-01-20', 'Martin Luther King Jr. Day'),
  ('2025-02-17', 'Presidents'' Day'),
  ('2025-05-26', 'Memorial Day'),
  ('2025-06-19', 'Juneteenth'),
  ('2025-07-04', 'Independence Day'),
  ('2025-09-01', 'Labor Day'),
  ('2025-10-13', 'Columbus Day'),
  ('2025-11-11', 'Veterans Day'),
  ('2025-11-27', 'Thanksgiving Day'),
  ('2025-12-25', 'Christmas Day')
ON CONFLICT (holiday_date) DO NOTHING;

-- 2026 Holidays
INSERT INTO public.holidays (holiday_date, holiday_name) VALUES
  ('2026-01-01', 'New Year''s Day'),
  ('2026-01-19', 'Martin Luther King Jr. Day'),
  ('2026-02-16', 'Presidents'' Day'),
  ('2026-05-25', 'Memorial Day'),
  ('2026-06-19', 'Juneteenth'),
  ('2026-07-03', 'Independence Day (Observed)'), -- July 4 is Saturday, observed Friday
  ('2026-09-07', 'Labor Day'),
  ('2026-10-12', 'Columbus Day'),
  ('2026-11-11', 'Veterans Day'),
  ('2026-11-26', 'Thanksgiving Day'),
  ('2026-12-25', 'Christmas Day')
ON CONFLICT (holiday_date) DO NOTHING;

-- =====================================================
-- STEP 3: Helper function to check if date is business day
-- =====================================================

CREATE OR REPLACE FUNCTION is_business_day(check_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
  day_of_week INTEGER;
  is_holiday BOOLEAN;
BEGIN
  -- Get day of week (0=Sunday, 6=Saturday)
  day_of_week := EXTRACT(DOW FROM check_date);

  -- Check if weekend
  IF day_of_week IN (0, 6) THEN
    RETURN false;
  END IF;

  -- Check if holiday
  SELECT EXISTS(
    SELECT 1 FROM public.holidays
    WHERE holiday_date = check_date
  ) INTO is_holiday;

  RETURN NOT is_holiday;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 4: Function to get next business day
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_business_day(start_date DATE)
RETURNS DATE AS $$
DECLARE
  current_date DATE := start_date;
  max_iterations INTEGER := 10; -- Prevent infinite loops
  iteration_count INTEGER := 0;
BEGIN
  WHILE NOT is_business_day(current_date) AND iteration_count < max_iterations LOOP
    current_date := current_date + INTERVAL '1 day';
    iteration_count := iteration_count + 1;
  END LOOP;

  RETURN current_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 5: Function to get previous business day
-- =====================================================

CREATE OR REPLACE FUNCTION get_previous_business_day(start_date DATE)
RETURNS DATE AS $$
DECLARE
  current_date DATE := start_date;
  max_iterations INTEGER := 10; -- Prevent infinite loops
  iteration_count INTEGER := 0;
BEGIN
  WHILE NOT is_business_day(current_date) AND iteration_count < max_iterations LOOP
    current_date := current_date - INTERVAL '1 day';
    iteration_count := iteration_count + 1;
  END LOOP;

  RETURN current_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 6: Add documentation
-- =====================================================

COMMENT ON TABLE public.holidays IS
  'US Federal Holidays used for business day calculations in forecast generation';

COMMENT ON FUNCTION is_business_day(DATE) IS
  'Returns true if the date is a business day (not weekend or holiday)';

COMMENT ON FUNCTION get_next_business_day(DATE) IS
  'Returns the next business day from the given date (moves forward if weekend/holiday)';

COMMENT ON FUNCTION get_previous_business_day(DATE) IS
  'Returns the previous business day from the given date (moves backward if weekend/holiday)';
