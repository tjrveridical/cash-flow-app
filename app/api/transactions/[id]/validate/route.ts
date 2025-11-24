import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ValidateTransactionRequest } from "@/lib/types/forecast";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body: ValidateTransactionRequest = await request.json();

    if (!body.forecast_item_id) {
      return NextResponse.json(
        { success: false, error: "forecast_item_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("raw_transactions")
      .update({
        validated: true,
        forecast_item_id: body.forecast_item_id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, transaction: data });
  } catch (error) {
    console.error("Error validating transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
