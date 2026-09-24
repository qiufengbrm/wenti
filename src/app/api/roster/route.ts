import { NextResponse } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";
import { publishedConflicts } from "@/lib/roster-service";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const admin = canAccessAdmin(auth.user.role);
  const terms = await prisma.academicTerm.findMany({ orderBy: { startDate: "desc" }, include: {
    templates: true, candidates: { include: { user: { select: { id: true, name: true, volunteerSchedule: { select: { academicTerm: true, source: true } }, campusSession: { select: { status: true, expiresAt: true } } } } } },
    roster: { include: { shifts: { orderBy: [{ date: "asc" }, { startTime: "asc" }], include: { assignments: { include: { user: { select: { id: true, name: true } } } } } } } }
  } });
  const visible = terms.filter((term) => admin || term.roster?.status === "PUBLISHED").map((term) => ({
    id: term.id, code: term.code, startDate: term.startDate.toISOString().slice(0, 10), weekCount: term.weekCount,
    scheduleWeeks: term.scheduleWeeks ? JSON.parse(term.scheduleWeeks) as number[] : Array.from({ length: term.weekCount }, (_, index) => index + 1),
    templates: admin ? term.templates : undefined,
    candidates: admin && term.candidates ? term.candidates.map((candidate) => ({ id: candidate.user.id, name: candidate.user.name, scheduleTerm: candidate.user.volunteerSchedule?.academicTerm, scheduleSource: candidate.user.volunteerSchedule?.source, campusStatus: candidate.user.campusSession?.status, campusExpiresAt: candidate.user.campusSession?.expiresAt })) : undefined,
    roster: term.roster && (admin || term.roster.status === "PUBLISHED") ? {
      id: term.roster.id, status: term.roster.status, publishedAt: term.roster.publishedAt,
      shifts: term.roster.shifts.map((shift) => ({ id: shift.id, week: shift.week, date: shift.date.toISOString().slice(0, 10), startTime: shift.startTime, endTime: shift.endTime, location: shift.location, requiredCount: shift.requiredCount, assignments: shift.assignments.map((assignment) => ({ id: assignment.user.id, name: assignment.user.name })) }))
    } : null
  }));
  const volunteers = admin ? await prisma.user.findMany({ where: { role: "VOLUNTEER", status: "ACTIVE", deletedAt: null }, select: { id: true, name: true, volunteerSchedule: { select: { academicTerm: true, source: true } }, campusSession: { select: { status: true, expiresAt: true } } }, orderBy: { name: "asc" } }) : undefined;
  const conflicts = admin ? (await Promise.all(terms.filter((term) => term.roster?.status === "PUBLISHED").map((term) => publishedConflicts(term.roster!.id)))).flat() : undefined;
  return NextResponse.json({ terms: visible, volunteers, conflicts });
}
