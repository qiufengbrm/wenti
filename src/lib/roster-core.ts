import type { ScheduleCourseData } from "@/types/schedule";

export type ShiftInput = { key: string; week: number; date: string; dayOfWeek: number; startTime: string; endTime: string; location: string; requiredCount: number; eligible: string[] };

export function dateForTeachingWeek(startDate: string, week: number, dayOfWeek: number) {
  const date = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || week < 1 || dayOfWeek < 1 || dayOfWeek > 7) throw new Error("教学周日期无效");
  date.setUTCDate(date.getUTCDate() + (week - 1) * 7 + dayOfWeek - 1);
  return date.toISOString().slice(0, 10);
}

export function conflictsWithCourse(course: Pick<ScheduleCourseData, "dayOfWeek" | "startTime" | "endTime" | "weeks">, shift: Pick<ShiftInput, "dayOfWeek" | "week" | "startTime" | "endTime">) {
  return course.dayOfWeek === shift.dayOfWeek && (course.weeks.length === 0 || course.weeks.includes(shift.week))
    && course.startTime < shift.endTime && shift.startTime < course.endTime;
}

export function parseCourseWeeks(value: string): number[] {
  try {
    const weeks: unknown = JSON.parse(value);
    if (!Array.isArray(weeks) || !weeks.every((week) => Number.isInteger(week) && week >= 1 && week <= 30)) throw new Error("invalid weeks");
    return weeks;
  } catch { throw new Error("课表周次损坏，无法排班"); }
}
