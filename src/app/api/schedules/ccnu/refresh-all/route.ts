import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { refreshAllCampusSchedules } from "@/lib/ccnu-sync";
import { requireSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const input = await request.json().catch(() => ({})) as { term?: string };
  if (!/^\d{4}-\d{4}-[12]$/.test(input.term ?? "")) return NextResponse.json({ message: "学期格式无效" }, { status: 400 });
  return NextResponse.json(await refreshAllCampusSchedules(input.term!));
}
