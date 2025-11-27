import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("ar_forecast")
      .select("*")
      .order("week_ending", { ascending: true });

    if (error) {
      console.error("Error fetching AR forecasts:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ forecasts: data || [] });
  } catch (error) {
    console.error("AR forecast GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
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
    const { week_ending, forecasted_amount, notes } = body;

    // Validation
    if (!week_ending || forecasted_amount === undefined) {
      return NextResponse.json(
        { error: "week_ending and forecasted_amount are required" },
        { status: 400 }
      );
    }

    // Parse amount
    const amount = parseFloat(forecasted_amount);
    if (isNaN(amount)) {
      return NextResponse.json(
        { error: "forecasted_amount must be a valid number" },
        { status: 400 }
      );
    }

    // Get current user (optional - V1 doesn't have auth yet)
    // const { data: { user } } = await supabase.auth.getUser();

    // Upsert (insert or update if week_ending exists)
    const { data, error } = await supabase
      .from("ar_forecast")
      .upsert(
        {
          week_ending,
          forecasted_amount: amount,
          notes: notes || null,
          // created_by: user?.id,  // V1: no auth
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "week_ending",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting AR forecast:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ forecast: data });
  } catch (error) {
    console.error("AR forecast POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
