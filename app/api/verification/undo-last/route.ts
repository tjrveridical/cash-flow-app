import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the most recent verification timestamp
    const { data: latest, error: latestError } = await supabase
      .from("classified_bank_transactions")
      .select("verified_at")
      .eq("is_verified", true)
      .not("verified_at", "is", null)
      .order("verified_at", { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latest) {
      return NextResponse.json(
        { success: false, error: "No verified transactions found" },
        { status: 404 }
      );
    }

    const lastVerifiedAt = latest.verified_at;

    // Count how many transactions were verified at that exact timestamp
    const { count, error: countError } = await supabase
      .from("classified_bank_transactions")
      .select("*", { count: "exact", head: true })
      .eq("verified_at", lastVerifiedAt);

    if (countError) {
      throw countError;
    }

    // Unverify all transactions with that timestamp
    const { error: updateError } = await supabase
      .from("classified_bank_transactions")
      .update({
        is_verified: false,
        verified_at: null,
        verified_by: null,
      })
      .eq("verified_at", lastVerifiedAt);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
      timestamp: lastVerifiedAt,
      message: `Successfully unverified ${count} transaction(s) from ${new Date(lastVerifiedAt).toLocaleString()}`,
    });
  } catch (error) {
    console.error("Error undoing verification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
