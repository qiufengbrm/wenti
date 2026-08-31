/** 项目导读：接口路由 /api/schedules：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { isVolunteer } from "@/lib/permissions";
import { parseScheduleWorkbook } from "@/lib/schedule-parser";

export const runtime = "nodejs";

const maxFileSize = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  if (!isVolunteer(auth.user.role)) return NextResponse.json({ message: "只有志愿者可以录入自己的课表" }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ message: "请选择课表文件" }, { status: 400 });
    if (file.size <= 0) return NextResponse.json({ message: "课表文件为空" }, { status: 400 });
    if (file.size > maxFileSize) return NextResponse.json({ message: "课表文件不能超过 5MB" }, { status: 400 });

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "xls" && extension !== "xlsx") {
      return NextResponse.json({ message: "仅支持学校导出的 .xls 或 .xlsx 课表" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseScheduleWorkbook(buffer, file.name, file.size);

    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.volunteerSchedule.findUnique({ where: { userId: auth.user!.id }, select: { id: true } });
      if (existing) await transaction.volunteerSchedule.delete({ where: { id: existing.id } });

      await transaction.volunteerSchedule.create({
        data: {
          userId: auth.user!.id,
          academicTerm: parsed.academicTerm,
          className: parsed.className || null,
          major: parsed.major || null,
          department: parsed.department || null,
          sourceFileName: parsed.sourceFileName,
          fileSize: parsed.fileSize,
          courses: {
            create: parsed.courses.map((course) => ({
              dayOfWeek: course.dayOfWeek,
              startTime: course.startTime,
              endTime: course.endTime,
              courseName: course.courseName,
              details: course.details,
              weeks: JSON.stringify(course.weeks),
              originalText: course.originalText
            }))
          }
        }
      });
    });

    return NextResponse.json({ message: `课表录入成功，共识别 ${parsed.courses.length} 门课程`, courseCount: parsed.courses.length });
  } catch (error) {
    console.error("schedule upload failed", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "课表解析失败，请重新导出后再试" }, { status: 400 });
  }
}
