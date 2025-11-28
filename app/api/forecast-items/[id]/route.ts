import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();

    // Validation
    if (body.vendor_name && body.vendor_name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Vendor name cannot be empty" },
        { status: 400 }
      );
    }

    if (body.estimated_amount && body.estimated_amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Estimated amount must be greater than 0" },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (body.vendor_name) updates.vendor_name = body.vendor_name.trim();
    if (body.estimated_amount) updates.estimated_amount = body.estimated_amount;
    if (body.rule_id) updates.rule_id = body.rule_id;
    if (body.category_code !== undefined) updates.category_code = body.category_code;
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data, error } = await supabase
      .from("forecast_items")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        rule:payment_rules!rule_id (*)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error("Error updating forecast item:", error);
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("forecast_items")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting forecast item:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
