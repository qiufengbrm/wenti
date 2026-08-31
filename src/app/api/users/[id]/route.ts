/** 项目导读：接口路由 /api/users/[id]：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { getHourProofArtifactKeys } from "@/lib/hour-proof-preview";
import { isSuperAdmin } from "@/lib/permissions";
import { removeStoredKeys } from "@/lib/resource-storage";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  if (!isSuperAdmin(auth.user.role)) return NextResponse.json({ message: "仅超级管理员可以删除账号" }, { status: 403 });

  const { id } = await params;
  const target = await getDeletionTarget(id);
  if (!target) return NextResponse.json({ message: "账号不存在" }, { status: 404 });
  if (target.role === "SUPER_ADMIN") return NextResponse.json({ message: "超级管理员账号不能在此删除" }, { status: 403 });

  return NextResponse.json({ data: formatImpact(target) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  if (!isSuperAdmin(auth.user.role)) return NextResponse.json({ message: "仅超级管理员可以删除账号" }, { status: 403 });

  const { id } = await params;
  if (id === auth.user.id) return NextResponse.json({ message: "不能删除当前登录的账号" }, { status: 400 });
  const payload = (await request.json().catch(() => ({}))) as { deleteRelatedData?: boolean; confirmUsername?: string };
  const target = await getDeletionTarget(id);
  if (!target) return NextResponse.json({ message: "账号不存在" }, { status: 404 });
  if (target.role === "SUPER_ADMIN") return NextResponse.json({ message: "超级管理员账号不能在此删除" }, { status: 403 });

  if (!payload.deleteRelatedData) {
    if (target.deletedAt) return NextResponse.json({ message: "该账号已经删除" }, { status: 409 });
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { status: "DISABLED", deletedAt: new Date() } }),
      prisma.operationLog.create({
        data: {
          userId: auth.user.id,
          action: "删除登录账号",
          targetType: "User",
          targetId: target.id,
          detail: `删除登录账号并保留关联信息：${target.name}（${target.username}）`
        }
      })
    ]);
    return NextResponse.json({ message: "登录账号已删除，关联信息已保留" });
  }

  if (payload.confirmUsername !== target.username) {
    return NextResponse.json({ message: "输入的用户名不一致，已停止永久删除" }, { status: 400 });
  }

  const [taskProofs, hourProofs, resourceFiles] = await Promise.all([
    prisma.taskSubmission.findMany({ where: { userId: id }, select: { id: true, proofFileUrl: true } }),
    prisma.volunteerHour.findMany({ where: { userId: id }, select: { id: true, proofFileUrl: true } }),
    prisma.fileResource.findMany({ where: { uploadedById: id }, select: { storageKey: true, previewKey: true, posterKey: true } })
  ]);
  const storedKeys = [
    ...taskProofs.flatMap((item) => [item.proofFileUrl, ...getHourProofArtifactKeys("task", item.id)]),
    ...hourProofs.flatMap((item) => [item.proofFileUrl, ...getHourProofArtifactKeys("direct", item.id)]),
    ...resourceFiles.flatMap((item) => [item.storageKey, item.previewKey, item.posterKey])
  ];
  const impact = formatImpact(target);

  await prisma.$transaction(async (tx) => {
    await Promise.all([
      tx.notice.updateMany({ where: { createdById: id }, data: { createdById: auth.user!.id } }),
      tx.taskType.updateMany({ where: { createdById: id }, data: { createdById: auth.user!.id } }),
      tx.task.updateMany({ where: { createdById: id }, data: { createdById: auth.user!.id } }),
      tx.tutorial.updateMany({ where: { authorId: id }, data: { authorId: auth.user!.id } }),
      tx.resourceFolder.updateMany({ where: { createdById: id }, data: { createdById: auth.user!.id } }),
      tx.resourceProject.updateMany({ where: { createdById: id }, data: { createdById: auth.user!.id } })
    ]);
    await tx.message.deleteMany({ where: { OR: [{ receiverId: id }, { senderId: id }] } });
    await tx.fileResource.deleteMany({ where: { uploadedById: id } });
    await tx.user.delete({ where: { id } });
    await tx.operationLog.create({
      data: {
        userId: auth.user!.id,
        action: "永久删除账号及关联信息",
        targetType: "User",
        targetId: target.id,
        detail: `永久删除账号：${target.name}（${target.username}）；共享业务内容已转交当前超级管理员`
      }
    });
  });

  await removeStoredKeys(storedKeys);
  return NextResponse.json({ data: impact, message: "账号及个人关联信息已永久删除，共享业务内容已安全转交" });
}

async function getDeletionTarget(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      deletedAt: true,
      volunteerProfile: { select: { id: true } },
      _count: {
        select: {
          signups: true,
          taskSubmissions: true,
          volunteerHours: true,
          receivedMessages: true,
          sentMessages: true,
          noticeReads: true,
          files: true,
          resourceFolders: true,
          resourceProjects: true,
          tasks: true,
          notices: true,
          tutorials: true,
          taskTypes: true
        }
      }
    }
  });
}

function formatImpact(target: NonNullable<Awaited<ReturnType<typeof getDeletionTarget>>>) {
  return {
    id: target.id,
    name: target.name,
    username: target.username,
    role: target.role,
    personal: {
      profile: target.volunteerProfile ? 1 : 0,
      signups: target._count.signups,
      submissions: target._count.taskSubmissions,
      hours: target._count.volunteerHours,
      messages: target._count.receivedMessages + target._count.sentMessages,
      noticeReads: target._count.noticeReads,
      uploadedFiles: target._count.files
    },
    shared: {
      tasks: target._count.tasks,
      notices: target._count.notices,
      tutorials: target._count.tutorials,
      taskTypes: target._count.taskTypes,
      folders: target._count.resourceFolders,
      projects: target._count.resourceProjects
    }
  };
}
