/** 项目导读：接口路由 /api/hours/[id]/reject：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { removeHourProofStorageKeys } from "@/lib/hour-proof-storage";
import { getHourProofArtifactKeys } from "@/lib/hour-proof-preview";

type RecordType = "direct" | "taskSubmission" | "taskHour";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as { recordType?: RecordType; rejectReason?: string };
  const rejectReason = payload.rejectReason?.trim();

  if (!payload.recordType || !["direct", "taskSubmission", "taskHour"].includes(payload.recordType)) {
    return NextResponse.json({ error: "无效的时长记录类型" }, { status: 400 });
  }
  if (!rejectReason) return NextResponse.json({ error: "请填写驳回原因" }, { status: 400 });
  if (rejectReason.length > 1000) return NextResponse.json({ error: "驳回原因不能超过 1000 个字符" }, { status: 400 });

  if (payload.recordType === "taskSubmission") {
    const submission = await prisma.taskSubmission.findUnique({
      where: { id },
      include: { user: true, task: true }
    });
    if (!submission) return NextResponse.json({ error: "未找到该志愿时长记录" }, { status: 404 });
    if (submission.status !== "APPROVED") return NextResponse.json({ error: "只有已通过的志愿时长可以被驳回" }, { status: 409 });

    try {
      await prisma.$transaction(async (tx) => {
        // 状态、累计时长和消息必须同进同退，不能数据库只办一半手续就下班。
        const changed = await tx.taskSubmission.updateMany({
          where: { id: submission.id, status: "APPROVED" },
          data: {
            status: "REJECTED",
            reviewedById: auth.user.id,
            reviewedAt: new Date(),
            rejectReason,
            proofFileUrl: null,
            proofFileName: null,
            proofFileType: null,
            proofFileSize: null
          }
        });
        if (changed.count !== 1) throw new Error("RECORD_STATUS_CHANGED");

        await tx.taskSignup.updateMany({
          where: { taskId: submission.taskId, userId: submission.userId },
          data: { status: "REJECTED" }
        });
        await tx.volunteerHour.updateMany({
          where: { taskId: submission.taskId, userId: submission.userId, status: "APPROVED" },
          data: { status: "REJECTED", reviewedById: auth.user.id, rejectReason }
        });
        await tx.message.create({
          data: {
            receiverId: submission.userId,
            senderId: auth.user.id,
            title: "已通过的志愿时长被驳回",
            content: `项目：${submission.task.title}\n扣除时长：${submission.actualHours} 小时\n驳回原因：${rejectReason}`,
            category: "REPLY",
            relatedUrl: `/volunteer/tasks/${submission.taskId}`
          }
        });
        await tx.operationLog.create({
          data: {
            userId: auth.user.id,
            action: "驳回已通过志愿时长",
            targetType: "TaskSubmission",
            targetId: submission.id,
            detail: `${submission.user.name}｜${submission.task.title}｜${submission.actualHours} 小时｜原因：${rejectReason}`
          }
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "RECORD_STATUS_CHANGED") {
        return NextResponse.json({ error: "该记录状态已发生变化，请刷新后重试" }, { status: 409 });
      }
      throw error;
    }

    // 数据提交成功后再清磁盘；数据库是总账，附件是仓库，顺序不能反客为主。
    await removeHourProofStorageKeys([submission.proofFileUrl, ...getHourProofArtifactKeys("task", submission.id, submission.proofFileUrl)]);
    return NextResponse.json({ message: "已驳回该志愿时长、扣除累计时长并删除证明附件" });
  }

  const hour = await prisma.volunteerHour.findUnique({
    where: { id },
    include: { user: true, task: true }
  });
  if (!hour) return NextResponse.json({ error: "未找到该志愿时长记录" }, { status: 404 });
  if (hour.status !== "APPROVED") return NextResponse.json({ error: "只有已通过的志愿时长可以被驳回" }, { status: 409 });
  if (payload.recordType === "direct" && hour.taskId) return NextResponse.json({ error: "时长记录类型不匹配" }, { status: 400 });
  if (payload.recordType === "taskHour" && !hour.taskId) return NextResponse.json({ error: "时长记录类型不匹配" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      // 带上 APPROVED 条件做并发保护，两个管理员同时点也只能成功一次。
      const changed = await tx.volunteerHour.updateMany({
        where: { id: hour.id, status: "APPROVED" },
        data: {
          status: "REJECTED",
          reviewedById: auth.user.id,
          rejectReason,
          proofFileUrl: null,
          proofFileName: null,
          proofFileType: null,
          proofFileSize: null
        }
      });
      if (changed.count !== 1) throw new Error("RECORD_STATUS_CHANGED");

      if (hour.taskId) {
        await tx.taskSignup.updateMany({
          where: { taskId: hour.taskId, userId: hour.userId, status: "APPROVED" },
          data: { status: "REJECTED" }
        });
      }
      await tx.message.create({
        data: {
          receiverId: hour.userId,
          senderId: auth.user.id,
          title: "已通过的志愿时长被驳回",
          content: `服务内容：${hour.task?.title || hour.activityName}\n扣除时长：${hour.hours} 小时\n驳回原因：${rejectReason}`,
          category: "REPLY",
          relatedUrl: hour.taskId ? `/volunteer/tasks/${hour.taskId}` : "/volunteer/hours"
        }
      });
      await tx.operationLog.create({
        data: {
          userId: auth.user.id,
          action: "驳回已通过志愿时长",
          targetType: "VolunteerHour",
          targetId: hour.id,
          detail: `${hour.user.name}｜${hour.task?.title || hour.activityName}｜${hour.hours} 小时｜原因：${rejectReason}`
        }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RECORD_STATUS_CHANGED") {
      return NextResponse.json({ error: "该记录状态已发生变化，请刷新后重试" }, { status: 409 });
    }
    throw error;
  }

  await removeHourProofStorageKeys([hour.proofFileUrl, ...getHourProofArtifactKeys("direct", hour.id, hour.proofFileUrl)]);
  return NextResponse.json({ message: "已驳回该志愿时长、扣除累计时长并删除证明附件" });
}
