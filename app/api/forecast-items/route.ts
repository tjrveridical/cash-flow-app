import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CreateForecastItemRequest } from "@/lib/types/forecast";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("forecast_items")
      .select(
        `
        *,
        rule:payment_rules (*)
      `
      )
      .eq("is_active", true)
      .order("vendor_name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, items: data });
  } catch (error) {
    console.error("Error fetching forecast items:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body: CreateForecastItemRequest = await request.json();

    // Validation
    if (!body.vendor_name || body.vendor_name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Vendor name is required" },
        { status: 400 }
      );
    }

    if (!body.estimated_amount || body.estimated_amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Estimated amount must be greater than 0" },
        { status: 400 }
      );
    }

    let ruleId = body.rule_id;

    // If no rule_id provided, create a new rule inline
    if (!ruleId && body.frequency && body.anchor_days) {
      // Generate rule name
      const ruleName = generateRuleName(body.frequency, body.anchor_days);

      // Check if rule already exists
      const { data: existingRule } = await supabase
        .from("payment_rules")
        .select("id")
        .eq("rule_name", ruleName)
        .single();

      if (existingRule) {
        ruleId = existingRule.id;
      } else {
        // Create new rule
        const { data: newRule, error: ruleError } = await supabase
          .from("payment_rules")
          .insert({
            rule_name: ruleName,
            frequency: body.frequency,
            anchor_days: body.anchor_days,
            exception_rule: body.exception_rule || "move_later",
          })
          .select()
          .single();

        if (ruleError) {
          throw ruleError;
        }

        ruleId = newRule.id;
      }
    }

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: "Either rule_id or frequency/anchor_days must be provided" },
        { status: 400 }
      );
    }

    // Create forecast item
    const { data, error } = await supabase
      .from("forecast_items")
      .insert({
        vendor_name: body.vendor_name.trim(),
        estimated_amount: body.estimated_amount,
        rule_id: ruleId,
        category_code: body.category_code || null,
        notes: body.notes?.trim() || null,
        is_active: true,
      })
      .select(
        `
        *,
        rule:payment_rules (*)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error("Error creating forecast item:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to generate rule name
function generateRuleName(frequency: string, anchorDays: number[]): string {
  switch (frequency) {
    case "weekly":
      return `Weekly_${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][anchorDays[0]]}`;
    case "semi-monthly":
      return `SemiMonthly_${anchorDays[0]}_${anchorDays[1]}`;
    case "monthly":
      return anchorDays[0] === 31 ? "Monthly_LastDay" : `Monthly_${anchorDays[0]}`;
    case "quarterly": {
      const [day, month] = anchorDays;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `Quarterly_${day}_${monthNames[month - 1]}`;
    }
    case "semi-annual": {
      const [month1, day1, month2, day2] = anchorDays;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `SemiAnnual_${monthNames[month1 - 1]}${day1}_${monthNames[month2 - 1]}${day2}`;
    }
    case "annual": {
      const [month, day] = anchorDays;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `Annual_${monthNames[month - 1]}${day}`;
    }
    default:
      return `Custom_${frequency}`;
  }
}
