import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete in order due to foreign key constraints
    // 1. Delete vendor_rule_assignments (references raw_transactions)
    const { error: assignmentsError } = await supabase
      .from("vendor_rule_assignments")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (assignmentsError) {
      console.error("Error deleting vendor_rule_assignments:", assignmentsError);
      throw new Error(`Failed to delete vendor assignments: ${assignmentsError.message}`);
    }

    // 2. Delete classified_bank_transactions (references raw_transactions)
    const { error: classifiedError } = await supabase
      .from("classified_bank_transactions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (classifiedError) {
      console.error("Error deleting classified_bank_transactions:", classifiedError);
      throw new Error(`Failed to delete classifications: ${classifiedError.message}`);
    }

    // 3. Delete raw_transactions
    const { error: transactionsError } = await supabase
      .from("raw_transactions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (transactionsError) {
      console.error("Error deleting raw_transactions:", transactionsError);
      throw new Error(`Failed to delete transactions: ${transactionsError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "All transactions, classifications, and vendor assignments have been purged.",
    });
  } catch (error) {
    console.error("Purge error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
