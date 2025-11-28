import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorName = searchParams.get("vendor");

    if (!vendorName) {
      return NextResponse.json(
        { success: false, error: "Vendor name is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculate date 12 months ago
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const dateFilter = twelveMonthsAgo.toISOString().split("T")[0];

    // Fetch transactions matching vendor name from last 12 months
    const { data: transactions, error } = await supabase
      .from("raw_transactions")
      .select(
        `
        id,
        date,
        amount,
        name,
        description,
        classified_bank_transactions (
          category_code,
          is_verified,
          display_categories (
            display_label,
            display_group
          )
        )
      `
      )
      .ilike("name", `%${vendorName}%`)
      .gte("date", dateFilter)
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    // Filter to only include transactions with classifications
    const classifiedTransactions = (transactions || []).filter(
      (tx: any) => tx.classified_bank_transactions && tx.classified_bank_transactions.length > 0
    );

    // Calculate stats
    const totalCount = classifiedTransactions.length;
    const verifiedTransactions = classifiedTransactions.filter(
      (tx: any) => tx.classified_bank_transactions[0]?.is_verified === true
    );
    const verifiedCount = verifiedTransactions.length;
    const verificationRate = totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0;

    // Calculate averages
    const allAmounts = classifiedTransactions.map((tx: any) => Math.abs(tx.amount));
    const verifiedAmounts = verifiedTransactions.map((tx: any) => Math.abs(tx.amount));

    const averageAll =
      allAmounts.length > 0
        ? allAmounts.reduce((sum, amt) => sum + amt, 0) / allAmounts.length
        : 0;

    const averageVerified =
      verifiedAmounts.length > 0
        ? verifiedAmounts.reduce((sum, amt) => sum + amt, 0) / verifiedAmounts.length
        : 0;

    // Suggested forecast: prefer verified average, fall back to all average
    const suggestedForecast = verifiedCount > 0 ? averageVerified : averageAll;

    // Transform transactions for response
    const transformedTransactions = classifiedTransactions.map((tx: any) => {
      const classification = tx.classified_bank_transactions[0];
      return {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        name: tx.name,
        description: tx.description,
        categoryCode: classification?.category_code || null,
        categoryLabel: classification?.display_categories?.display_label || "Unclassified",
        displayGroup: classification?.display_categories?.display_group || "Other",
        isVerified: classification?.is_verified || false,
      };
    });

    return NextResponse.json({
      success: true,
      transactions: transformedTransactions,
      stats: {
        totalCount,
        verifiedCount,
        verificationRate: Math.round(verificationRate),
        averageAll: Math.round(averageAll),
        averageVerified: Math.round(averageVerified),
        suggestedForecast: Math.round(suggestedForecast),
      },
    });
  } catch (error) {
    console.error("Error fetching historical actuals:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
