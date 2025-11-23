import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CreatePaymentRuleRequest } from "@/lib/types/payment-rules";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("payment_rules")
      .select(
        `
        *,
        vendor:vendors (*)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, rules: data });
  } catch (error) {
    console.error("Error fetching payment rules:", error);
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

    const body: CreatePaymentRuleRequest = await request.json();

    // Validation
    if (!body.vendor_id || !body.frequency || !body.anchor_days || !body.estimated_amount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.anchor_days) || body.anchor_days.length === 0) {
      return NextResponse.json(
        { success: false, error: "anchor_days must be a non-empty array" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("payment_rules")
      .insert({
        vendor_id: body.vendor_id,
        frequency: body.frequency,
        anchor_days: body.anchor_days,
        exception_rule: body.exception_rule || "move_later",
        estimated_amount: body.estimated_amount,
        category_code: body.category_code || null,
        notes: body.notes || null,
      })
      .select(
        `
        *,
        vendor:vendors (*)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, rule: data });
  } catch (error) {
    console.error("Error creating payment rule:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
