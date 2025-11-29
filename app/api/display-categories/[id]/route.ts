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
    if (body.display_group && body.display_group.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Display group cannot be empty" },
        { status: 400 }
      );
    }

    if (body.display_label && body.display_label.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Display label cannot be empty" },
        { status: 400 }
      );
    }

    if (body.category_code && body.category_code.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Category code cannot be empty" },
        { status: 400 }
      );
    }

    // If category_code is being changed, check for duplicates
    if (body.category_code) {
      const { data: existing } = await supabase
        .from("display_categories")
        .select("category_code")
        .eq("category_code", body.category_code.trim())
        .neq("category_code", id)
        .single();

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Category code already exists" },
          { status: 400 }
        );
      }
    }

    const updates: any = {};
    if (body.display_group !== undefined) updates.display_group = body.display_group.trim();
    if (body.display_label !== undefined) updates.display_label = body.display_label.trim();
    if (body.display_label2 !== undefined) updates.display_label2 = body.display_label2?.trim() || null;
    if (body.category_code !== undefined) updates.category_code = body.category_code.trim();
    if (body.cash_direction !== undefined) updates.cash_direction = body.cash_direction;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from("display_categories")
      .update(updates)
      .eq("category_code", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, category: data });
  } catch (error) {
    console.error("Error updating category:", error);
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

    // Check dependencies in forecast_items
    const { count: forecastCount, error: forecastError } = await supabase
      .from("forecast_items")
      .select("*", { count: "exact", head: true })
      .eq("category_code", id);

    if (forecastError) {
      throw forecastError;
    }

    // Check dependencies in classified_bank_transactions
    const { count: transactionCount, error: transactionError } = await supabase
      .from("classified_bank_transactions")
      .select("*", { count: "exact", head: true })
      .eq("category_code", id);

    if (transactionError) {
      throw transactionError;
    }

    const totalDependencies = (forecastCount || 0) + (transactionCount || 0);

    if (totalDependencies > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete. Used by ${forecastCount || 0} forecast items and ${transactionCount || 0} transactions.`,
          dependencies: {
            forecastItems: forecastCount || 0,
            transactions: transactionCount || 0,
          },
        },
        { status: 400 }
      );
    }

    // No dependencies, safe to delete
    const { error: deleteError } = await supabase
      .from("display_categories")
      .delete()
      .eq("category_code", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
