import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { count, error } = await supabase
      .from("raw_transactions")
      .select("*", { count: "exact", head: true })
      .eq("validated", false);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, count: count || 0 });
  } catch (error) {
    console.error("Error fetching unvalidated count:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
