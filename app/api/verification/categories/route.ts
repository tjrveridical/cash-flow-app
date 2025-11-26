import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all categories from display_categories
    const { data, error } = await supabase
      .from("display_categories")
      .select("category_code, display_group, display_label, display_label2")
      .order("display_group", { ascending: true })
      .order("display_label", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw error;
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
