import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Display categories endpoint not yet implemented.",
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Display category creation not yet implemented.",
  });
}
