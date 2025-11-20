

import { createClient } from "@supabase/supabase-js";

export class ForecastService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async listWeeks() {
    return {
      success: true,
      message: "Forecast weeks logic not implemented."
    };
  }
}