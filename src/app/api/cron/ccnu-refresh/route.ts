import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { refreshAllCampusSchedules } from "@/lib/ccnu-sync";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ message: "未授权" }, { status: 401 });
  const today = new Date();
  const term = await prisma.academicTerm.findFirst({ where: { startDate: { lte: today } }, orderBy: { startDate: "desc" } });
  if (!term || today.getTime() > term.startDate.getTime() + term.weekCount * 7 * 86_400_000) return NextResponse.json({ refreshed: 0, needsAuthorization: [] });
  return NextResponse.json(await refreshAllCampusSchedules(term.code));
}
