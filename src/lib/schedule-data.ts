/** 项目导读：课表查询工具：负责日期、周次和空闲区间计算；时间边界一视同仁，不搞早八特殊照顾。 */
import { prisma } from "@/lib/db";
import type { ScheduleData } from "@/types/schedule";

export async function getVolunteerSchedule(userId: string): Promise<ScheduleData | null> {
  const schedule = await prisma.volunteerSchedule.findUnique({
    where: { userId },
    include: { courses: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }, { courseName: "asc" }] } }
  });
  return schedule ? serializeSchedule(schedule) : null;
}

export async function getScheduleDirectory() {
  const users = await prisma.user.findMany({
    where: { role: "VOLUNTEER", deletedAt: null },
    orderBy: [{ name: "asc" }, { studentId: "asc" }],
    include: {
      volunteerSchedule: {
        include: { courses: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] } }
      }
    }
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    studentId: user.studentId ?? "-",
    major: user.major ?? "-",
    className: user.className ?? "-",
    phone: user.phone ?? "-",
    schedule: user.volunteerSchedule ? serializeSchedule(user.volunteerSchedule) : null
  }));
}

export async function getAdminScheduleDetail(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: "VOLUNTEER", deletedAt: null },
    include: {
      volunteerSchedule: {
        include: { courses: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }, { courseName: "asc" }] } }
      }
    }
  });
  if (!user) return null;
  return {
    volunteer: { id: user.id, name: user.name, studentId: user.studentId ?? "-", major: user.major ?? "-", className: user.className ?? "-" },
    schedule: user.volunteerSchedule ? serializeSchedule(user.volunteerSchedule) : null
  };
}

function serializeSchedule(schedule: {
  id: string;
  academicTerm: string;
  className: string | null;
  major: string | null;
  department: string | null;
  sourceFileName: string;
  fileSize: number;
  uploadedAt: Date;
  courses: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    courseName: string;
    details: string;
    weeks: string;
    originalText: string;
  }>;
}): ScheduleData {
  return {
    id: schedule.id,
    academicTerm: schedule.academicTerm,
    className: schedule.className ?? "",
    major: schedule.major ?? "",
    department: schedule.department ?? "",
    sourceFileName: schedule.sourceFileName,
    fileSize: schedule.fileSize,
    uploadedAt: schedule.uploadedAt.toISOString(),
    courses: schedule.courses.map((course) => ({
      ...course,
      weeks: parseStoredWeeks(course.weeks)
    }))
  };
}

function parseStoredWeeks(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((week): week is number => Number.isInteger(week) && week >= 1 && week <= 30) : [];
  } catch {
    return [];
  }
}
