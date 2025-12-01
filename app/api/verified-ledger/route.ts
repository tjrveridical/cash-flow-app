import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all verified transactions with category details
    const { data: transactions, error } = await supabase
      .from("classified_bank_transactions")
      .select(`
        id,
        transaction_id,
        category_code,
        classification,
        classification_source,
        confidence_score,
        notes,
        classified_at,
        is_verified,
        verified_at,
        verified_by,
        raw_transactions (
          id,
          date,
          name,
          amount,
          description,
          source_system,
          transaction_type,
          qb_account_name
        ),
        display_categories (
          category_code,
          display_group,
          display_label,
          display_label2,
          cash_direction
        )
      `)
      .eq("is_verified", true)
      .order("raw_transactions(date)", { ascending: false });

    if (error) {
      throw error;
    }

    // Transform data to match frontend interface
    const transformedTransactions = (transactions || []).map((tx: any) => {
      const rawTx = tx.raw_transactions;
      const category = tx.display_categories;

      return {
        id: tx.id,
        transactionId: tx.transaction_id,
        date: rawTx?.date || "",
        vendor: rawTx?.name || "",
        amount: rawTx?.amount || 0,
        description: rawTx?.description || "",
        source: rawTx?.source_system || "",
        transactionType: rawTx?.transaction_type || "",
        qbAccountName: rawTx?.qb_account_name || "",
        categoryCode: tx.category_code || "",
        displayGroup: category?.display_group || "",
        displayLabel: category?.display_label || "",
        displayLabel2: category?.display_label2 || null,
        cashDirection: category?.cash_direction || "",
        classification: tx.classification || "",
        classificationSource: tx.classification_source || "",
        confidenceScore: tx.confidence_score,
        notes: tx.notes,
        classifiedAt: tx.classified_at || "",
        verifiedAt: tx.verified_at || "",
        verifiedBy: tx.verified_by || "",
      };
    });

    // Calculate stats
    const totalVerified = transformedTransactions.length;
    const totalInflow = transformedTransactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalOutflow = transformedTransactions
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return NextResponse.json({
      success: true,
      transactions: transformedTransactions,
      stats: {
        totalVerified,
        totalInflow,
        totalOutflow,
      },
    });
  } catch (error) {
    console.error("Error fetching verified transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
