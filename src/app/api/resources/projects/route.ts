/** 项目导读：接口路由 /api/resources/projects：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { parseResourceProjectDate, validateResourceName } from "@/lib/resource-drive";
import { ensureResourceOriginalDirectory } from "@/lib/resource-file-tree";

const projectSchema = z.object({ name: z.string(), description: z.string().max(2000).optional(), projectDate: z.string().optional() });

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;
  const parsed = projectSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "项目信息不完整" }, { status: 400 });
  const name = validateResourceName(parsed.data.name);
  if (!name) return NextResponse.json({ message: "项目名称无效" }, { status: 400 });
  const projectDate = parsed.data.projectDate === undefined ? undefined : parseResourceProjectDate(parsed.data.projectDate);
  if (parsed.data.projectDate !== undefined && !projectDate) return NextResponse.json({ message: "项目日期无效" }, { status: 400 });
  if (await prisma.resourceProject.findUnique({ where: { name }, select: { id: true } })) {
    return NextResponse.json({ message: "已存在同名活动项目" }, { status: 409 });
  }
  const project = await prisma.resourceProject.create({
    data: { name, description: parsed.data.description?.trim() || null, createdById: auth.user.id, createdAt: projectDate ?? undefined }
  });
  try {
    await ensureResourceOriginalDirectory(project.id);
    return NextResponse.json({ data: project, message: "活动项目已创建" }, { status: 201 });
  } catch (error) {
    await prisma.resourceProject.delete({ where: { id: project.id } }).catch(() => undefined);
    return NextResponse.json({ message: error instanceof Error ? error.message : "项目磁盘目录创建失败" }, { status: 500 });
  }
}
