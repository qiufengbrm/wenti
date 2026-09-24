/** 项目导读：接口路由 /api/users/[id]/password：仅允许超级管理员为普通管理员或志愿者恢复初始密码。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isSuperAdmin } from "@/lib/permissions";

const INITIAL_PASSWORD = "123456";

export async function PUT(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  if (!isSuperAdmin(auth.user.role)) return NextResponse.json({ message: "仅超级管理员可以重置密码" }, { status: 403 });

  const { id } = await params;
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, role: true, deletedAt: true }
  });

  if (!target || target.deletedAt) return NextResponse.json({ message: "账号不存在" }, { status: 404 });
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ message: "超级管理员密码请在个人设置中修改" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { passwordHash: hashPassword(INITIAL_PASSWORD), mustChangePassword: true }
    }),
    prisma.operationLog.create({
      data: {
        userId: auth.user.id,
        action: "重置账号密码",
        targetType: "User",
        targetId: target.id,
        detail: `重置账号密码：${target.name}（${target.username}）`
      }
    })
  ]);

  return NextResponse.json({ message: `账号 ${target.username} 的密码已重置为 123456` });
}
