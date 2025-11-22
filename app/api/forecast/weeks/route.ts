import { NextResponse } from "next/server";
import { ForecastService } from "@/lib/services/forecast-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const params = {
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    weeksCount: searchParams.get("weeksCount") ? parseInt(searchParams.get("weeksCount")!) : undefined,
  };

  const service = new ForecastService();
  const result = await service.listWeeks(params);
  return NextResponse.json(result);
}