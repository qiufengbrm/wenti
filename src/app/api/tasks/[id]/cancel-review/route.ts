/** 项目导读：接口路由 /api/tasks/[id]/cancel-review：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as { signupId?: string; approved?: boolean };

  if (!payload.signupId) {
    return NextResponse.json({ message: "缺少报名记录。" }, { status: 400 });
  }

  const signup = await prisma.taskSignup.findUnique({
    where: { id: payload.signupId },
    include: { task: true, user: true }
  });

  if (!signup || signup.taskId !== id) {
    return NextResponse.json({ message: "未找到取消申请。" }, { status: 404 });
  }

  const nextStatus = payload.approved ? "CANCELLED" : "SIGNED_UP";

  await prisma.$transaction([
    prisma.taskSignup.update({
      where: { id: signup.id },
      data: {
        status: nextStatus,
        cancelReviewedAt: new Date(),
        cancelReviewedById: auth.user.id
      }
    }),
    prisma.message.create({
      data: {
        receiverId: signup.userId,
        senderId: auth.user.id,
        title: payload.approved ? "取消申请已同意" : "取消申请未同意",
        content: payload.approved ? `项目：${signup.task.title}` : `项目：${signup.task.title}\n说明：请按时参加任务`,
        category: "REPLY",
        relatedUrl: `/volunteer/tasks/${signup.taskId}`
      }
    })
  ]);

  return NextResponse.json({ message: payload.approved ? "已同意取消申请，并通知志愿者。" : "已驳回取消申请，并通知志愿者。" });
}
