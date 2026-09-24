import { prisma } from "@/lib/db";
import { conflictsWithCourse, dateForTeachingWeek, parseCourseWeeks, type ShiftInput } from "@/lib/roster-core";
import { solveRoster } from "@/lib/roster-solver";

export function isScheduleUsable(user: { volunteerSchedule: { academicTerm: string; source: string } | null; campusSession: { status: string; expiresAt: Date } | null }, term: string) {
  const schedule = user.volunteerSchedule;
  return Boolean(schedule && schedule.academicTerm === term && (schedule.source !== "CCNU" || (user.campusSession?.status === "ACTIVE" && user.campusSession.expiresAt > new Date())));
}

export async function generateRoster(termId: string) {
  const term = await prisma.academicTerm.findUnique({ where: { id: termId }, include: { templates: true, candidates: { include: { user: { include: { volunteerSchedule: { include: { courses: true } }, campusSession: true } } } }, roster: true } });
  if (!term) throw new Error("学期不存在");
  if (term.roster?.status === "PUBLISHED") throw new Error("已发布排班不能重新生成");
  const start = term.startDate.toISOString().slice(0, 10);
  if (term.startDate.getUTCDay() !== 1) throw new Error("首周日期必须是周一");
  const users = term.candidates.map((candidate) => candidate.user).filter((user) => user.status === "ACTIVE" && !user.deletedAt && isScheduleUsable(user, term.code));
  const shifts: ShiftInput[] = [];
  const selectedWeeks = term.scheduleWeeks ? JSON.parse(term.scheduleWeeks) as number[] : Array.from({ length: term.weekCount }, (_, index) => index + 1);
  for (const week of selectedWeeks) {
    for (const template of term.templates) {
      const date = dateForTeachingWeek(start, week, template.dayOfWeek);
      const shift = { key: `${week}:${template.id}`, week, date, dayOfWeek: template.dayOfWeek, startTime: template.startTime, endTime: template.endTime, location: template.location, requiredCount: template.requiredCount, eligible: [] as string[] };
      shift.eligible = users.filter((user) => !user.volunteerSchedule!.courses.some((course) => conflictsWithCourse({ ...course, weeks: parseCourseWeeks(course.weeks) }, shift))).map((user) => user.id);
      shifts.push(shift);
    }
  }
  const assigned = await solveRoster(users.map((user) => user.id), shifts);
  await prisma.$transaction(async (tx) => {
    if (term.roster) await tx.roster.delete({ where: { id: term.roster.id } });
    await tx.roster.create({ data: { termId, shifts: { create: shifts.map((shift) => ({ week: shift.week, date: new Date(`${shift.date}T00:00:00Z`), startTime: shift.startTime, endTime: shift.endTime, location: shift.location, requiredCount: shift.requiredCount, assignments: { create: (assigned[shift.key] ?? []).map((userId) => ({ userId })) } })) } } });
  });
  return { shiftCount: shifts.length, vacancies: shifts.reduce((sum, shift) => sum + shift.requiredCount - (assigned[shift.key] ?? []).length, 0), excluded: term.candidates.length - users.length };
}

export async function validateAssignment(shiftId: string, userId: string) {
  const shift = await prisma.rosterShift.findUnique({ where: { id: shiftId }, include: { roster: { include: { term: { include: { candidates: true } }, shifts: { include: { assignments: true } } } } } });
  if (!shift) throw new Error("班次不存在");
  if (shift.roster.status !== "DRAFT") throw new Error("已发布排班不能修改");
  if (!shift.roster.term.candidates.some((candidate) => candidate.userId === userId)) throw new Error("此成员不在候选名单");
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { volunteerSchedule: { include: { courses: true } }, campusSession: true } });
  if (!user || user.status !== "ACTIVE" || user.deletedAt || !isScheduleUsable(user, shift.roster.term.code)) throw new Error("此成员没有当前学期有效课表");
  const dayOfWeek = shift.date.getUTCDay() || 7;
  if (user.volunteerSchedule!.courses.some((course) => conflictsWithCourse({ ...course, weeks: parseCourseWeeks(course.weeks) }, { dayOfWeek, week: shift.week, startTime: shift.startTime, endTime: shift.endTime }))) throw new Error("此成员该时段有课");
  if (shift.roster.shifts.some((other) => other.id !== shift.id && other.date.getTime() === shift.date.getTime() && other.assignments.some((assignment) => assignment.userId === userId))) throw new Error("此成员同日已有班次");
}

export async function publishedConflicts(rosterId: string) {
  const roster = await prisma.roster.findUnique({
    where: { id: rosterId },
    include: {
      term: { select: { code: true } },
      shifts: { include: { assignments: { include: { user: { include: { volunteerSchedule: { include: { courses: true } } } } } } } }
    }
  });
  if (!roster) return [];
  const result: Array<{ shiftId: string; userId: string; name: string }> = [];
  for (const shift of roster.shifts) for (const assignment of shift.assignments) {
    const schedule = assignment.user.volunteerSchedule;
    if (!schedule || schedule.academicTerm !== roster.term.code) continue;
    if (schedule.courses.some((course) => conflictsWithCourse({ ...course, weeks: parseCourseWeeks(course.weeks) }, { dayOfWeek: shift.date.getUTCDay() || 7, week: shift.week, startTime: shift.startTime, endTime: shift.endTime }))) {
      result.push({ shiftId: shift.id, userId: assignment.userId, name: assignment.user.name });
    }
  }
  return result;
}
