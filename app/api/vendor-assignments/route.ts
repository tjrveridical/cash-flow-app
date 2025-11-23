import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CreateVendorAssignmentRequest } from "@/lib/types/payment-rules";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("vendor_rule_assignments")
      .select(
        `
        *,
        vendor:vendors (*),
        payment_rule:payment_rules (*)
      `
      )
      .order("assigned_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, assignments: data });
  } catch (error) {
    console.error("Error fetching vendor assignments:", error);
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

    const body: CreateVendorAssignmentRequest = await request.json();

    if (!body.transaction_id || !body.vendor_id) {
      return NextResponse.json(
        { success: false, error: "transaction_id and vendor_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("vendor_rule_assignments")
      .insert({
        transaction_id: body.transaction_id,
        vendor_id: body.vendor_id,
        payment_rule_id: body.payment_rule_id || null,
        assigned_by: null, // Set to current user if auth is available
      })
      .select(
        `
        *,
        vendor:vendors (*),
        payment_rule:payment_rules (*)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, assignment: data });
  } catch (error) {
    console.error("Error creating vendor assignment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
