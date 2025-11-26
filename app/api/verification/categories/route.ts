import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all categories from display_categories
    // Only include categories with valid category_code (not null)
    const { data, error } = await supabase
      .from("display_categories")
      .select("category_code, display_group, display_label, display_label2")
      .not("category_code", "is", null)
      .order("display_group", { ascending: true })
      .order("display_label", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    // Log warning if any categories have null category_code (shouldn't happen with filter above)
    const invalidCategories = data?.filter((cat) => !cat.category_code);
    if (invalidCategories && invalidCategories.length > 0) {
      console.warn(
        `Found ${invalidCategories.length} categories with null category_code:`,
        invalidCategories
      );
    }

    return NextResponse.json({
      success: true,
      categories: data || [],
    });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
