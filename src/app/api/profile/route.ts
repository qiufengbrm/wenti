/** 项目导读：接口路由 /api/profile：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { isAdmin, isVolunteer } from "@/lib/permissions";

const profileSchema = z.object({
  name: z.string().trim().min(1, "姓名不能为空").max(50),
  username: z.string().trim().min(3, "登录账号至少需要 3 个字符").max(50).regex(/^\S+$/, "登录账号不能包含空格"),
  studentId: z.string().trim().max(50).optional().default(""),
  grade: z.string().trim().max(30).optional().default(""),
  major: z.string().trim().max(100).optional().default(""),
  className: z.string().trim().max(100).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  qq: z.string().trim().max(30).optional().default(""),
  wechat: z.string().trim().max(50).optional().default(""),
  skills: z.string().trim().max(500).optional().default("")
});

export async function PUT(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  if (!isVolunteer(auth.user.role) && !isAdmin(auth.user.role)) return NextResponse.json({ message: "当前账号无法修改个人资料" }, { status: 403 });

  const parsed = profileSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || "资料格式不正确，请检查输入长度" }, { status: 400 });

  const { name, username, studentId, grade, major, className, phone, qq, wechat, skills } = parsed.data;
  try {
    if (isVolunteer(auth.user.role)) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: auth.user.id },
          data: {
            name,
            username,
            studentId: studentId || null,
            grade: grade || null,
            major: major || null,
            className: className || null,
            phone: phone || null,
            qq: qq || null,
            wechat: wechat || null
          }
        }),
        prisma.volunteerProfile.upsert({
          where: { userId: auth.user.id },
          create: { userId: auth.user.id, skills: skills || null },
          update: { skills: skills || null }
        })
      ]);
    } else {
      await prisma.user.update({
        where: { id: auth.user.id },
        data: {
          name,
          username
        }
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      return NextResponse.json({ message: target.includes("username") ? "该登录账号已被使用" : "该学号已被使用" }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ message: "个人资料已保存" });
}
