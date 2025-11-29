import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("display_categories")
      .upsert({
        category_code: "other_other",
        display_group: "Other",
        display_label: "Unclassified",
        display_label2: null,
        cash_direction: "Cashout",
        sort_order: 9999,
      }, { onConflict: "category_code" });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Added 'other_other' category",
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
