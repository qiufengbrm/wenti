/** 项目导读：接口路由 /api/task-types：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;

  const data = await prisma.taskType.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;

  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    defaultTemplate?: string;
    defaultHours?: number;
    isActive?: boolean;
  };

  if (!payload.name?.trim()) {
    return NextResponse.json({ message: "请填写任务类型名称。" }, { status: 400 });
  }

  const data = await prisma.taskType.create({
    data: {
      name: payload.name.trim(),
      description: payload.description ?? "",
      defaultTemplate: payload.defaultTemplate ?? "",
      defaultHours: payload.defaultHours,
      isActive: payload.isActive ?? true,
      createdById: auth.user.id
    }
  });

  return NextResponse.json({ data, message: "任务类型已写入数据库。" });
}
