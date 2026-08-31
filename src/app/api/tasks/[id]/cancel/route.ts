/** 项目导读：接口路由 /api/tasks/[id]/cancel：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { isVolunteer } from "@/lib/permissions";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  if (!isVolunteer(auth.user.role)) {
    return NextResponse.json({ message: "只有普通志愿者可以取消自己的任务" }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as { reason?: string };
  const signup = await prisma.taskSignup.findUnique({
    where: { taskId_userId: { taskId: id, userId: auth.user.id } },
    include: { task: true, user: true }
  });

  if (!signup) {
    return NextResponse.json({ message: "你尚未接取该任务。" }, { status: 400 });
  }

  if (!signup.task.allowCancel) {
    return NextResponse.json({ message: "该任务发布时未开启取消申请。" }, { status: 400 });
  }

  if (!payload.reason?.trim()) {
    return NextResponse.json({ message: "请填写取消原因。" }, { status: 400 });
  }

  const updated = await prisma.taskSignup.update({
    where: { id: signup.id },
    data: {
      status: signup.task.cancelNeedsReview ? "CANCEL_REQUESTED" : "CANCELLED",
      cancelReason: payload.reason.trim(),
      cancelRequestedAt: new Date()
    }
  });

  await prisma.message.create({
    data: {
      receiverId: signup.task.createdById,
      senderId: auth.user.id,
      title: "取消申请",
      content: `申请人：${signup.user.name}\n项目：${signup.task.title}\n原因：${payload.reason.trim()}`,
      category: "APPLICATION",
      relatedUrl: `/admin/tasks/${signup.taskId}`
    }
  });

  return NextResponse.json({ data: updated, message: "取消申请已提交，已通知发布任务的部门负责人审核。" });
}
