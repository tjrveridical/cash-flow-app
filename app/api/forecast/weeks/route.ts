import { NextResponse } from "next/server";
import { ForecastService } from "@/lib/services/forecast-service";

export async function GET() {
  const service = new ForecastService();
  const result = await service.listWeeks();
  return NextResponse.json(result);
}