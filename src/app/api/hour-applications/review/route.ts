/** 项目导读：接口路由 /api/hour-applications/review：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;
  const payload = (await request.json().catch(() => ({}))) as { ids?: string[] };
  const ids = Array.from(new Set(payload.ids?.filter((id) => typeof id === "string") ?? [])).slice(0, 100);
  if (!ids.length) return NextResponse.json({ message: "请先选择待审核申请" }, { status: 400 });

  const applications = await prisma.volunteerHour.findMany({ where: { id: { in: ids }, taskId: null, status: "PENDING" } });
  if (!applications.length) return NextResponse.json({ message: "所选申请已处理或不存在" }, { status: 409 });

  await prisma.$transaction([
    prisma.volunteerHour.updateMany({
      where: { id: { in: applications.map((item) => item.id) }, status: "PENDING" },
      data: { status: "APPROVED", reviewedById: auth.user.id, rejectReason: null }
    }),
    ...applications.map((application) => prisma.message.create({
      data: {
        receiverId: application.userId,
        senderId: auth.user!.id,
        title: "志愿时长申请已通过",
        content: `服务内容：${application.activityName}\n确认时长：${application.hours} 小时`,
        category: "REPLY",
        relatedUrl: "/volunteer/hours"
      }
    }))
  ]);

  return NextResponse.json({ message: `已批量通过 ${applications.length} 条申请`, data: { count: applications.length } });
}
