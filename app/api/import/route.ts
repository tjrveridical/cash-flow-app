import { NextResponse } from "next/server";
import { ImportService } from "@/lib/services/import-service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({
      success: false,
      message: "No file provided."
    });
  }

  const text = await file.text();
  const sourceSystem = (formData.get("sourceSystem") as string) || "quickbooks";

  const service = new ImportService();
  const result = await service.import(text, sourceSystem as any);

  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    success: false,
    message: "Import history not implemented."
  });
}