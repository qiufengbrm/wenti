/** 项目导读：接口路由 /api/profile/password：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "新密码至少需要 8 位").max(72),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, { message: "两次输入的新密码不一致" });

export async function PUT(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  const parsed = passwordSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "密码格式不正确" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { passwordHash: true } });
  if (!user || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    return NextResponse.json({ message: "当前密码不正确" }, { status: 400 });
  }
  if (verifyPassword(parsed.data.newPassword, user.passwordHash)) {
    return NextResponse.json({ message: "新密码不能与当前密码相同" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: auth.user.id }, data: { passwordHash: hashPassword(parsed.data.newPassword), mustChangePassword: false } });
  return NextResponse.json({ message: "密码修改成功" });
}
