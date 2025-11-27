import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { id } = await params;

    // Get rule name
    const { data: rule, error: ruleError } = await supabase
      .from("payment_rules")
      .select("rule_name")
      .eq("id", id)
      .maybeSingle();

    if (ruleError) {
      console.error("Error fetching payment rule:", ruleError);
      throw ruleError;
    }

    if (!rule) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment rule not found",
        },
        { status: 404 }
      );
    }

    // Check forecast_items dependencies
    // Note: This will be fully implemented when forecast_items table exists
    const { data: items, error: itemsError } = await supabase
      .from("forecast_items")
      .select("id, vendor, amount, category_code")
      .eq("rule_name", rule.rule_name);

    // If table doesn't exist yet, return zero dependencies
    if (itemsError && itemsError.message.includes("does not exist")) {
      return NextResponse.json({
        success: true,
        count: 0,
        items: [],
        message: "Forecast items table not yet created",
      });
    }

    if (itemsError) {
      console.error("Error fetching dependencies:", itemsError);
      throw itemsError;
    }

    return NextResponse.json({
      success: true,
      count: items?.length || 0,
      items: items || [],
    });
  } catch (error) {
    console.error("Dependencies API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
