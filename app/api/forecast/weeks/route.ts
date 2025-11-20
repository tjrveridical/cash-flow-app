import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Forecast weeks endpoint not yet implemented.",
  });
}
