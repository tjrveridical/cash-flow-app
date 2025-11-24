import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // "all", "validated", "unvalidated"

    let query = supabase
      .from("raw_transactions")
      .select(
        `
        *,
        forecast_item:forecast_items (
          *,
          rule:payment_rules (*)
        )
      `
      )
      .order("date", { ascending: false });

    // Apply filter
    if (filter === "validated") {
      query = query.eq("validated", true);
    } else if (filter === "unvalidated") {
      query = query.eq("validated", false);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, transactions: data });
  } catch (error) {
    console.error("Error fetching actuals:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
