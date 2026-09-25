import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { requireSameOrigin } from "@/lib/request-security";
import { validateAssignment } from "@/lib/roster-service";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const input = await request.json().catch(() => ({})) as { termId?: string };
  if (!input.termId) return NextResponse.json({ message: "请选择学期" }, { status: 400 });
  const roster = await prisma.roster.findUnique({ where: { termId: input.termId }, include: { shifts: { include: { assignments: true } } } });
  if (!roster || roster.status !== "DRAFT") return NextResponse.json({ message: "没有可发布的草稿" }, { status: 409 });
  if (!roster.shifts.length || roster.shifts.some((shift) => shift.assignments.length !== shift.requiredCount)) return NextResponse.json({ message: "尚有人员缺口，不能发布" }, { status: 409 });
  try {
    for (const shift of roster.shifts) for (const assignment of shift.assignments) await validateAssignment(shift.id, assignment.userId);
    await prisma.roster.update({ where: { id: roster.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "发布失败" }, { status: 400 }); }
}
