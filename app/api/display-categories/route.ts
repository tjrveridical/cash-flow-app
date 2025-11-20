import { NextResponse } from "next/server";
import { DisplayCategoryService } from "@/lib/services/display-category-service";

export async function GET() {
  const service = new DisplayCategoryService();
  const result = await service.list();
  return NextResponse.json(result);
}

export async function POST() {
  const service = new DisplayCategoryService();
  const result = await service.create();
  return NextResponse.json(result);
}
