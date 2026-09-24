import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { generateRoster } from "@/lib/roster-service";
import { requireSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const input = await request.json().catch(() => ({})) as { termId?: string };
  if (!input.termId) return NextResponse.json({ message: "请选择学期" }, { status: 400 });
  try { return NextResponse.json(await generateRoster(input.termId)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "生成失败" }, { status: 400 }); }
}
