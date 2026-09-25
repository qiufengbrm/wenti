import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { requireSameOrigin } from "@/lib/request-security";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const schema = z.object({
  code: z.string().regex(/^\d{4}-\d{4}-[12]$/),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekCount: z.number().int().min(1).max(30),
  scheduleWeeks: z.array(z.number().int().min(1).max(30)).min(1).max(30).optional(),
  candidateIds: z.array(z.string()).max(300),
  templates: z.array(z.object({ dayOfWeek: z.number().int().min(1).max(7), startTime: time, endTime: time, location: z.string().trim().min(1).max(100), requiredCount: z.number().int().min(1).max(30) })).min(1).max(30)
});

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "学期、班次或候选成员格式无效" }, { status: 400 });
  const input = parsed.data;
  const scheduleWeeks = input.scheduleWeeks ?? Array.from({ length: input.weekCount }, (_, index) => index + 1);
  if (new Set(scheduleWeeks).size !== scheduleWeeks.length || scheduleWeeks.some((week) => week > input.weekCount)) return NextResponse.json({ message: "排班周次无效" }, { status: 400 });
  const date = new Date(`${input.startDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.startDate || date.getUTCDay() !== 1 || input.templates.some((template) => template.startTime >= template.endTime)) return NextResponse.json({ message: "首周日期必须为周一，班次结束时间必须晚于开始时间" }, { status: 400 });
  const candidateIds = [...new Set(input.candidateIds)];
  const count = await prisma.user.count({ where: { id: { in: candidateIds }, role: "VOLUNTEER", status: "ACTIVE", deletedAt: null } });
  if (count !== candidateIds.length) return NextResponse.json({ message: "候选名单包含无效成员" }, { status: 400 });
  try {
    const term = await prisma.$transaction(async (tx) => {
      const current = await tx.academicTerm.findUnique({ where: { code: input.code }, include: { roster: true } });
      if (current?.roster?.status === "PUBLISHED") throw new Error("已发布学期不可修改配置");
      if (current?.roster) await tx.roster.delete({ where: { id: current.roster.id } });
      if (current) {
        await tx.rosterTemplate.deleteMany({ where: { termId: current.id } });
        await tx.rosterCandidate.deleteMany({ where: { termId: current.id } });
      }
      return tx.academicTerm.upsert({
        where: { code: input.code },
        create: { code: input.code, startDate: date, weekCount: input.weekCount, scheduleWeeks: JSON.stringify(scheduleWeeks), templates: { create: input.templates }, candidates: { create: candidateIds.map((userId) => ({ userId })) } },
        update: { startDate: date, weekCount: input.weekCount, scheduleWeeks: JSON.stringify(scheduleWeeks), templates: { create: input.templates }, candidates: { create: candidateIds.map((userId) => ({ userId })) } }
      });
    });
    return NextResponse.json({ id: term.id });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}
