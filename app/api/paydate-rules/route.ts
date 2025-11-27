import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all payment rules ordered by frequency, then rule_name
    const { data, error } = await supabase
      .from("payment_rules")
      .select("*")
      .order("frequency", { ascending: true })
      .order("rule_name", { ascending: true });

    if (error) {
      console.error("Error fetching payment rules:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      rules: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Payment rules API error:", error);
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

    const body = await request.json();
    const {
      rule_name,
      frequency,
      anchor_day,
      anchor_day2,
      months,
      business_day_adjustment,
    } = body;

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

    // Check for duplicate rule_name
    const { data: existing } = await supabase
      .from("payment_rules")
      .select("id")
      .eq("rule_name", rule_name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Rule with name '${rule_name}' already exists`,
        },
        { status: 409 }
      );
    }

    // Insert new rule
    const { data, error } = await supabase
      .from("payment_rules")
      .insert({
        rule_name,
        frequency,
        anchor_day,
        anchor_day2: anchor_day2 || null,
        months: months || null,
        business_day_adjustment,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating payment rule:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      rule: data,
    });
  } catch (error) {
    console.error("Payment rules POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
