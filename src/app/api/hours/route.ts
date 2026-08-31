/** 项目导读：接口路由 /api/hours：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  const data = await prisma.volunteerHour.findMany({
    where: canAccessAdmin(auth.user.role) ? undefined : { userId: auth.user.id },
    include: {
      user: true,
      task: true,
      reviewedBy: true
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ data });
}
