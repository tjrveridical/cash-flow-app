import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface UnverifyRequest {
  id: string; // classified_bank_transactions.id
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body: UnverifyRequest = await request.json();
    const { id } = body;

    // Validation
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Update the transaction to set is_verified = false
    const { error: updateError } = await supabase
      .from("classified_bank_transactions")
      .update({
        is_verified: false,
        verified_at: null,
        verified_by: null,
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "Transaction moved back to verification inbox",
    });
  } catch (error) {
    console.error("Error unverifying transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
