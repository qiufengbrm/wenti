/** 项目导读：接口路由 /api/tasks/[id]/review：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { removeStoredKeys } from "@/lib/resource-storage";
import { getHourProofArtifactKeys } from "@/lib/hour-proof-preview";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;

  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as { signupId?: string; approved?: boolean; rejectReason?: string };

  if (!payload.signupId) {
    return NextResponse.json({ message: "缺少报名记录。" }, { status: 400 });
  }

  const signup = await prisma.taskSignup.findUnique({
    where: { id: payload.signupId },
    include: {
      task: true,
      user: true,
      submissions: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });

  const submission = signup?.submissions[0];
  if (!signup || signup.taskId !== id || !submission) {
    return NextResponse.json({ message: "未找到待审核提交。" }, { status: 404 });
  }

  if (payload.approved) {
    await prisma.$transaction([
      prisma.taskSubmission.update({
        where: { id: submission.id },
        data: { status: "APPROVED", reviewedById: auth.user.id, reviewedAt: new Date() }
      }),
      prisma.taskSignup.update({
        where: { id: signup.id },
        data: { status: "APPROVED" }
      }),
      prisma.volunteerHour.upsert({
        where: { userId_taskId: { userId: signup.userId, taskId: signup.taskId } },
        create: {
          userId: signup.userId,
          taskId: signup.taskId,
          activityName: signup.task.title,
          workContent: submission.description,
          hours: submission.actualHours,
          status: "APPROVED",
          reviewedById: auth.user.id
        },
        update: {
          workContent: submission.description,
          hours: submission.actualHours,
          status: "APPROVED",
          reviewedById: auth.user.id
        }
      }),
      prisma.message.create({
        data: {
          receiverId: signup.userId,
          senderId: auth.user.id,
          title: "志愿时长申报已同意",
          content: `项目：${signup.task.title}\n申报时长：${submission.actualHours} 小时`,
          category: "REPLY",
          relatedUrl: `/volunteer/tasks/${signup.taskId}`
        }
      })
    ]);

    return NextResponse.json({ message: "已同意志愿时长申报，志愿时长已写入数据库。" });
  }

  await prisma.$transaction([
    prisma.taskSubmission.update({
      where: { id: submission.id },
      data: {
        status: "REJECTED",
        reviewedById: auth.user.id,
        reviewedAt: new Date(),
        rejectReason: payload.rejectReason ?? "申报时长或完成说明需修改。",
        proofFileUrl: null,
        proofFileName: null,
        proofFileType: null,
        proofFileSize: null
      }
    }),
    prisma.taskSignup.update({
      where: { id: signup.id },
      data: { status: "REJECTED" }
    }),
    prisma.message.create({
      data: {
        receiverId: signup.userId,
        senderId: auth.user.id,
        title: "志愿时长申报未同意",
        content: `项目：${signup.task.title}\n原因：${payload.rejectReason ?? "申报时长或完成说明需修改"}`,
        category: "REPLY",
        relatedUrl: `/volunteer/tasks/${signup.taskId}`
      }
    })
  ]);

  await removeStoredKeys([submission.proofFileUrl, ...getHourProofArtifactKeys("task", submission.id)]);

  return NextResponse.json({ message: "已不同意志愿时长申报、删除证明附件，并通知志愿者。" });
}
