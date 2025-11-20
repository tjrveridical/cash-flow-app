import { createClient } from "@supabase/supabase-js";

export class ClassificationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async classifyAll() {
    return {
      success: true,
      message: "Classification logic not implemented."
    };
  }
}
