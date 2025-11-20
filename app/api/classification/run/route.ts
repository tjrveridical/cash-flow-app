import { NextResponse } from "next/server";
import { ClassificationService } from "@/lib/services/classification-service";

export async function POST() {
  const service = new ClassificationService();
  const result = await service.classifyAll();

  return NextResponse.json(result);
}