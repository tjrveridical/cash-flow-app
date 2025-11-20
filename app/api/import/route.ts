import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "CSV import engine not yet implemented.",
  });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Import history not yet implemented.",
  });
}