/** 项目导读：接口路由 /api/tasks/[id]：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin, requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { removeHourProofStorageKeys } from "@/lib/hour-proof-storage";
import { getHourProofArtifactKeys } from "@/lib/hour-proof-preview";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  return NextResponse.json({
    module: "tasks",
    action: "detail",
    id,
    message: "任务详情接口占位，后续接入任务、报名和证明查询"
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  const payload = await request.json().catch(() => ({}));
  if (payload.action !== "archive") {
    return NextResponse.json({ message: "不支持的任务操作" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id }, select: { id: true, title: true, status: true } });
  if (!task) return NextResponse.json({ message: "任务不存在" }, { status: 404 });
  if (task.status === "ARCHIVED") return NextResponse.json({ message: "任务已经归档" });

  const archived = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({ where: { id }, data: { status: "ARCHIVED" } });
    await tx.operationLog.create({
      data: {
        userId: auth.user!.id,
        action: "归档任务",
        targetType: "Task",
        targetId: task.id,
        detail: `归档任务：${task.title}`
      }
    });
    return updated;
  });

  return NextResponse.json({ data: archived, message: "任务已归档" });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      submissions: { select: { id: true, proofFileUrl: true } },
      _count: { select: { signups: true, submissions: true, volunteerHours: true } }
    }
  });
  if (!task) return NextResponse.json({ message: "任务不存在" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.volunteerHour.updateMany({ where: { taskId: id }, data: { taskId: null } });
    await tx.message.updateMany({
      where: { relatedUrl: { in: [`/volunteer/tasks/${id}`, `/admin/tasks/${id}`] } },
      data: { relatedUrl: null }
    });
    await tx.task.delete({ where: { id } });
    await tx.operationLog.create({
      data: {
        userId: auth.user!.id,
        action: "删除任务",
        targetType: "Task",
        targetId: task.id,
        detail: `永久删除任务：${task.title}；报名 ${task._count.signups} 条，提交 ${task._count.submissions} 条；保留志愿时长 ${task._count.volunteerHours} 条并解除任务关联`
      }
    });
  });

  await removeHourProofStorageKeys(task.submissions.flatMap((submission) => [submission.proofFileUrl, ...getHourProofArtifactKeys("task", submission.id, submission.proofFileUrl)]));

  return NextResponse.json({
    message: "任务已永久删除",
    data: {
      deletedSignups: task._count.signups,
      deletedSubmissions: task._count.submissions,
      preservedVolunteerHours: task._count.volunteerHours
    }
  });
}
