import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BulkValidateRequest } from "@/lib/types/forecast";

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body: BulkValidateRequest = await request.json();

    if (!body.transaction_ids || body.transaction_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "transaction_ids array is required" },
        { status: 400 }
      );
    }

    // Note: This assumes all transactions have already been assigned a forecast_item_id
    // by the user before clicking "Validate Selected"
    const { data, error } = await supabase
      .from("raw_transactions")
      .update({ validated: true })
      .in("id", body.transaction_ids)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      validated_count: data.length,
      transactions: data
    });
  } catch (error) {
    console.error("Error bulk validating transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
