import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyBatch } from "@/lib/classification/engine";

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const classifiedCount = await classifyBatch(1000, supabase);

    return NextResponse.json({
      success: true,
      classifiedCount,
      message: "Classification complete",
    });
  } catch (error) {
    console.error("Classification API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
