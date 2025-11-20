import { createClient } from "@supabase/supabase-js";

export class DisplayCategoryService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async list() {
    return {
      success: true,
      message: "Display category list not implemented."
    };
  }

  async create() {
    return {
      success: true,
      message: "Display category creation not implemented."
    };
  }
}
