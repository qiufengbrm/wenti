import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { requireSameOrigin } from "@/lib/request-security";
import { validateAssignment } from "@/lib/roster-service";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const input = await request.json().catch(() => ({})) as { userIds?: unknown };
  if (!Array.isArray(input.userIds) || input.userIds.some((item) => typeof item !== "string") || new Set(input.userIds).size !== input.userIds.length) return NextResponse.json({ message: "分配名单无效" }, { status: 400 });
  const shift = await prisma.rosterShift.findUnique({ where: { id }, include: { roster: true } });
  if (!shift) return NextResponse.json({ message: "班次不存在" }, { status: 404 });
  if (shift.roster.status !== "DRAFT") return NextResponse.json({ message: "只能调整草稿" }, { status: 409 });
  if (input.userIds.length > shift.requiredCount) return NextResponse.json({ message: "人数超过班次需求" }, { status: 400 });
  try {
    for (const userId of input.userIds as string[]) await validateAssignment(id, userId);
    await prisma.$transaction(async (tx) => {
      await tx.rosterAssignment.deleteMany({ where: { shiftId: id } });
      await tx.rosterAssignment.createMany({ data: (input.userIds as string[]).map((userId) => ({ shiftId: id, userId })) });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "调整失败" }, { status: 400 }); }
}
