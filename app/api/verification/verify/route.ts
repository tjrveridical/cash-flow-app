import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid or empty ids array" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update classified_bank_transactions to mark as verified
    const { data, error } = await supabase
      .from("classified_bank_transactions")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: "CFO",
      })
      .in("id", ids)
      .select();

    if (error) {
      console.error("Error verifying transactions:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Verification API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
