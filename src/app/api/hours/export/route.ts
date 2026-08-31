/** 项目导读：接口路由 /api/hours/export：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { createSimpleXlsx } from "@/lib/xlsx";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;

  const month = request.nextUrl.searchParams.get("month");
  const scope = request.nextUrl.searchParams.get("scope");
  if (scope !== "all" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "")) {
    return NextResponse.json({ message: "请选择有效的导出月份" }, { status: 400 });
  }

  const volunteers = await prisma.user.findMany({
    where: { role: "VOLUNTEER" },
    include: {
      volunteerHours: {
        where: { status: "APPROVED" },
        include: { task: true }
      }
    },
    orderBy: [{ name: "asc" }]
  });

  const rows = volunteers.map((volunteer) => {
    const includedHours = scope === "all"
      ? volunteer.volunteerHours
      : volunteer.volunteerHours.filter((record) => monthKey(record.serviceStartAt ?? record.task?.startTime ?? record.createdAt) === month);
    const totalHours = Math.round(includedHours.reduce((total, record) => total + record.hours, 0) * 100) / 100;
    return [volunteer.name, volunteer.studentId ?? "", totalHours] as [string, string, number];
  });
  const fileLabel = scope === "all" ? "全部" : month!;
  const workbook = createSimpleXlsx(`${fileLabel}志愿时长`, [["姓名", "学号", "总志愿时长"], ...rows]);
  const fileName = `志愿者时长汇总-${fileLabel}.xlsx`;
  const asciiFileName = scope === "all" ? "volunteer-hours-all.xlsx" : `volunteer-hours-${fileLabel}.xlsx`;

  return new NextResponse(new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store"
    }
  });
}

function monthKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit" }).formatToParts(value);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}
