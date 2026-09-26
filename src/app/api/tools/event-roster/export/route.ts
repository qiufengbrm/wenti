/** 项目导读：赛事跟进表导出接口：重验人工确认结果并生成规范 Excel，不把浏览器传来的表格照单全收。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { createRosterWorkbook, safeRosterFileName } from "@/lib/event-roster/excel";
import { exportRequestSchema } from "@/lib/event-roster/schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  try {
    const parsed = exportRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "排班表数据格式无效，请返回上一步检查" }, { status: 400 });
    const eventIds = new Set(parsed.data.events.map((item) => item.id));
    const groupedIds = parsed.data.groups.flatMap((group) => group.eventIds);
    if (groupedIds.some((id) => !eventIds.has(id))) {
      return NextResponse.json({ message: "时间段包含不存在的赛事" }, { status: 400 });
    }
    if (new Set(groupedIds).size !== groupedIds.length || eventIds.size !== new Set(groupedIds).size) {
      return NextResponse.json({ message: "每条赛事必须且只能归入一个时间段" }, { status: 400 });
    }
    const workbook = await createRosterWorkbook(parsed.data.events, parsed.data.groups);
    const fileName = safeRosterFileName(parsed.data.title);
    return new NextResponse(workbook, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="event-roster.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("event roster export failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "Excel 生成失败，请稍后重试" }, { status: 500 });
  }
}
