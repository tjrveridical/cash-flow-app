import { createClient } from "@supabase/supabase-js";
import { ForecastService as CoreForecastService, ForecastParams } from "@/lib/forecast";

export class ForecastService {
  private supabase;
  private coreService;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.coreService = new CoreForecastService(this.supabase);
  }

  async listWeeks(params?: ForecastParams) {
    return await this.coreService.generateWeeklyForecast(params);
  }
}