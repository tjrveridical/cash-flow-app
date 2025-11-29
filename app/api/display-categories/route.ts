import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("display_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, categories: data });
  } catch (error) {
    console.error("Error fetching categories:", error);
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

    // Validation
    if (!body.display_group || body.display_group.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Display group is required" },
        { status: 400 }
      );
    }

    if (!body.display_label || body.display_label.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Display label is required" },
        { status: 400 }
      );
    }

    if (!body.category_code || body.category_code.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Category code is required" },
        { status: 400 }
      );
    }

    if (!body.cash_direction) {
      return NextResponse.json(
        { success: false, error: "Cash direction is required" },
        { status: 400 }
      );
    }

    // Check for duplicate category_code
    const { data: existing } = await supabase
      .from("display_categories")
      .select("category_code")
      .eq("category_code", body.category_code.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Category code already exists" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("display_categories")
      .insert({
        category_code: body.category_code.trim(),
        display_group: body.display_group.trim(),
        display_label: body.display_label.trim(),
        display_label2: body.display_label2?.trim() || null,
        cash_direction: body.cash_direction,
        sort_order: body.sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, category: data });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
