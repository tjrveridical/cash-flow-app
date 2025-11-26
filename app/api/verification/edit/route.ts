import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { id, category_code } = await request.json();

    if (!id || !category_code) {
      return NextResponse.json(
        { success: false, error: "Missing id or category_code" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update classified_bank_transactions with new classification
    const { data, error } = await supabase
      .from("classified_bank_transactions")
      .update({
        category_code: category_code,
        classification_source: "manual",
        classified_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating transaction classification:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
    });
  } catch (error) {
    console.error("Edit API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
