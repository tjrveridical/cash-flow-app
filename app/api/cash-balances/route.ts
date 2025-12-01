import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { as_of_date, balance, notes } = body;

    // Validation
    if (!as_of_date || !balance) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: as_of_date and balance are required" },
        { status: 400 }
      );
    }

    if (parseFloat(balance) <= 0) {
      return NextResponse.json(
        { success: false, error: "Balance must be greater than 0" },
        { status: 400 }
      );
    }

    // Upsert to cash_balances table
    const { data, error } = await supabase
      .from("cash_balances")
      .upsert(
        {
          bank_account: "Operating", // Hardcoded for V1
          as_of_date,
          balance: parseFloat(balance),
          notes: notes || null,
          entered_by: null, // No auth yet
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "bank_account,as_of_date", // Update if exists
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting cash balance:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Unexpected error in POST /api/cash-balances:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
