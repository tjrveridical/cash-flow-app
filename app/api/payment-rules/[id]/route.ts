import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UpdatePaymentRuleRequest } from "@/lib/types/payment-rules";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body: Partial<UpdatePaymentRuleRequest> = await request.json();
    const { id } = await params;

    // Build update object with only provided fields
    const updateData: any = {};
    if (body.frequency) updateData.frequency = body.frequency;
    if (body.anchor_days) updateData.anchor_days = body.anchor_days;
    if (body.exception_rule) updateData.exception_rule = body.exception_rule;
    if (body.estimated_amount !== undefined) updateData.estimated_amount = body.estimated_amount;
    if (body.category_code !== undefined) updateData.category_code = body.category_code;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data, error } = await supabase
      .from("payment_rules")
      .update(updateData)
      .eq("id", id)
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
    console.error("Error updating payment rule:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { id } = await params;

    const { error } = await supabase.from("payment_rules").delete().eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment rule:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
