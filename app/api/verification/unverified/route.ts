import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch unverified classifications with transaction and category details
    const { data: unverified, error } = await supabase
      .from("classified_bank_transactions")
      .select(
        `
        id,
        transaction_id,
        category_code,
        classification,
        classification_source,
        confidence_score,
        notes,
        classified_at,
        transaction:raw_transactions!transaction_id (
          date,
          amount,
          name,
          description,
          source_system,
          transaction_type,
          qb_account_name
        ),
        category:display_categories!category_code (
          display_group,
          display_label,
          display_label2,
          cash_direction
        )
      `
      )
      .eq("is_verified", false)
      .order("raw_transactions(date)", { ascending: false });

    if (error) {
      console.error("Error fetching unverified transactions:", error);
      throw error;
    }

    // Transform data for frontend
    const transactions = (unverified || []).map((item: any) => {
      const tx = item.transaction;
      const cat = item.category;

      return {
        id: item.id,
        transactionId: item.transaction_id,
        date: tx?.date || null,
        vendor: tx?.name || "Unknown",
        amount: tx?.amount || 0,
        description: tx?.description || "",
        source: tx?.source_system || "quickbooks",
        transactionType: tx?.transaction_type || "",
        qbAccountName: tx?.qb_account_name || "",
        categoryCode: item.category_code,
        displayGroup: cat?.display_group || "Other",
        displayLabel: cat?.display_label || "Unclassified",
        displayLabel2: cat?.display_label2 || null,
        cashDirection: cat?.cash_direction || "Cashout",
        classification: item.classification,
        classificationSource: item.classification_source,
        confidenceScore: item.confidence_score,
        notes: item.notes,
        classifiedAt: item.classified_at,
      };
    });

    // Calculate stats
    const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const needsClassification = transactions.filter(
      (tx) => tx.categoryCode === "other_other" || !tx.categoryCode
    ).length;

    return NextResponse.json({
      success: true,
      transactions,
      stats: {
        pendingCount: transactions.length,
        totalAmount,
        needsClassification,
      },
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
