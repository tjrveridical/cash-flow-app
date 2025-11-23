import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get transactions that don't have vendor assignments
    // Only show recent transactions (last 90 days) that are outflows (negative amounts)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateFilter = ninetyDaysAgo.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("raw_transactions")
      .select(
        `
        *,
        assignment:vendor_rule_assignments!transaction_id (id)
      `
      )
      .is("assignment.id", null)
      .lt("amount", 0) // Only outflows (negative amounts)
      .gte("date", dateFilter)
      .order("date", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, transactions: data });
  } catch (error) {
    console.error("Error fetching unassigned transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
