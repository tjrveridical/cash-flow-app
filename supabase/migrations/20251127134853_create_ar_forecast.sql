-- AR Forecast table for manual CFO weekly revenue projections
CREATE TABLE ar_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_ending date NOT NULL UNIQUE,
  forecasted_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast week lookups
CREATE INDEX idx_ar_forecast_week_ending ON ar_forecast(week_ending);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ar_forecast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ar_forecast_updated_at
  BEFORE UPDATE ON ar_forecast
  FOR EACH ROW
  EXECUTE FUNCTION update_ar_forecast_updated_at();

-- Comments
COMMENT ON TABLE ar_forecast IS 'Manual CFO entries for expected AR collections by week';
COMMENT ON COLUMN ar_forecast.week_ending IS 'Sunday date of week (e.g., 2025-11-23 for week ending Nov 23)';
COMMENT ON COLUMN ar_forecast.forecasted_amount IS 'Expected AR collections for this week';
