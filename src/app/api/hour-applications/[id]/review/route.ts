/** 项目导读：接口路由 /api/hour-applications/[id]/review：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { removeHourProofStorageKeys } from "@/lib/hour-proof-storage";
import { getHourProofArtifactKeys } from "@/lib/hour-proof-preview";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;
  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as { approved?: boolean; rejectReason?: string };
  const application = await prisma.volunteerHour.findUnique({ where: { id }, include: { user: true } });
  if (!application || application.taskId || application.status !== "PENDING") return NextResponse.json({ message: "未找到待审核的志愿时长申请" }, { status: 404 });

  const approved = payload.approved === true;
  const rejectReason = payload.rejectReason?.trim() || "申请内容或证明材料需要补充";
  await prisma.$transaction([
    prisma.volunteerHour.update({
      where: { id },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        reviewedById: auth.user.id,
        rejectReason: approved ? null : rejectReason,
        ...(!approved ? { proofFileUrl: null, proofFileName: null, proofFileType: null, proofFileSize: null } : {})
      }
    }),
    prisma.message.create({
      data: {
        receiverId: application.userId,
        senderId: auth.user.id,
        title: approved ? "志愿时长申请已通过" : "志愿时长申请已驳回",
        content: approved
          ? `服务内容：${application.activityName}\n确认时长：${application.hours} 小时`
          : `服务内容：${application.activityName}\n驳回原因：${rejectReason}`,
        category: "REPLY",
        relatedUrl: "/volunteer/hours"
      }
    })
  ]);

  if (!approved) await removeHourProofStorageKeys([application.proofFileUrl, ...getHourProofArtifactKeys("direct", application.id, application.proofFileUrl)]);

  return NextResponse.json({ message: approved ? "已通过申请并计入志愿时长" : "已驳回申请、删除证明附件并通知志愿者" });
}
