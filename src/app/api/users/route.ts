/** 项目导读：接口路由 /api/users：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isSuperAdmin } from "@/lib/permissions";

const createUserSchema = z.object({
  role: z.enum(["ADMIN", "VOLUNTEER"]),
  name: z.string().trim().min(1, "请输入姓名").max(50, "姓名不能超过 50 个字符"),
  username: z
    .string()
    .trim()
    .min(3, "登录账号至少需要 3 个字符")
    .max(50, "登录账号不能超过 50 个字符")
    .regex(/^[A-Za-z0-9_.-]+$/, "登录账号只能包含字母、数字、下划线、短横线和英文句点"),
  password: z.string().min(6, "初始密码至少需要 6 位").max(128, "初始密码不能超过 128 位")
});

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  if (!isSuperAdmin(auth.user.role)) {
    return NextResponse.json({ message: "仅超级管理员可以创建账号" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "账号信息不完整" }, { status: 400 });
  }

  const { role, name, username, password } = parsed.data;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          username,
          passwordHash: hashPassword(password),
          mustChangePassword: true,
          role,
          status: "ACTIVE",
          studentId: role === "VOLUNTEER" ? username : null,
          ...(role === "VOLUNTEER" ? { volunteerProfile: { create: { status: "ACTIVE" } } } : {})
        },
        select: { id: true, name: true, username: true, role: true }
      });

      await tx.operationLog.create({
        data: {
          userId: auth.user.id,
          action: "创建账号",
          targetType: "User",
          targetId: created.id,
          detail: `创建${role === "ADMIN" ? "部门负责人" : "普通志愿者"}账号：${created.username}`
        }
      });

      return created;
    });

    return NextResponse.json({ data: user, message: `账号 ${user.username} 创建成功` }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "登录账号或志愿者学号已存在" }, { status: 409 });
    }

    console.error("创建账号失败", error);
    return NextResponse.json({ message: "创建账号失败，请稍后重试" }, { status: 500 });
  }
}
