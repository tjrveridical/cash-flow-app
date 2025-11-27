import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { id } = params;
    const body = await request.json();
    const {
      rule_name,
      frequency,
      anchor_day,
      anchor_day2,
      months,
      business_day_adjustment,
    } = body;

    // Validate rule exists
    const { data: existing, error: existingError } = await supabase
      .from("payment_rules")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing rule:", existingError);
      throw existingError;
    }

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment rule not found",
        },
        { status: 404 }
      );
    }

    // Validation
    if (!rule_name || !frequency || !anchor_day || !business_day_adjustment) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: rule_name, frequency, anchor_day, business_day_adjustment",
        },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ['Weekly', 'SemiMonthly', 'Monthly', 'Quarterly', 'SemiAnnual', 'Annually'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate business_day_adjustment
    if (!['next', 'previous'].includes(business_day_adjustment)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid business_day_adjustment. Must be 'next' or 'previous'",
        },
        { status: 400 }
      );
    }

    // Check for duplicate rule_name (excluding current rule)
    const { data: duplicate } = await supabase
      .from("payment_rules")
      .select("id")
      .eq("rule_name", rule_name)
      .neq("id", id)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: `Another rule with name '${rule_name}' already exists`,
        },
        { status: 409 }
      );
    }

    // Update rule
    const { data, error } = await supabase
      .from("payment_rules")
      .update({
        rule_name,
        frequency,
        anchor_day,
        anchor_day2: anchor_day2 || null,
        months: months || null,
        business_day_adjustment,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating payment rule:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      rule: data,
    });
  } catch (error) {
    console.error("Payment rules PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { id } = params;

    // Validate rule exists
    const { data: existing, error: existingError } = await supabase
      .from("payment_rules")
      .select("rule_name")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing rule:", existingError);
      throw existingError;
    }

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment rule not found",
        },
        { status: 404 }
      );
    }

    // Check dependencies (forecast_items referencing this rule)
    // Note: This will be implemented when forecast_items table exists
    // For now, we'll allow deletion
    const { data: dependencies, error: depError } = await supabase
      .from("forecast_items")
      .select("id")
      .eq("rule_name", existing.rule_name);

    // Only throw error if it's not a "table not found" error
    if (depError && !depError.message.includes("does not exist")) {
      console.error("Error checking dependencies:", depError);
      throw depError;
    }

    const dependencyCount = dependencies?.length || 0;

    if (dependencyCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete rule '${existing.rule_name}'. It is referenced by ${dependencyCount} forecast item(s).`,
          dependency_count: dependencyCount,
        },
        { status: 409 }
      );
    }

    // Delete rule
    const { error } = await supabase
      .from("payment_rules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting payment rule:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Rule '${existing.rule_name}' deleted successfully`,
    });
  } catch (error) {
    console.error("Payment rules DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
