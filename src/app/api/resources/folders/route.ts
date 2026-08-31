/** 项目导读：接口路由 /api/resources/folders：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { canAccessFolder, ensureNameAvailable, validateResourceName } from "@/lib/resource-drive";
import { ensureResourceOriginalDirectory } from "@/lib/resource-file-tree";

const folderSchema = z.object({
  name: z.string(),
  projectId: z.string(),
  parentId: z.string().nullable().optional(),
  visibility: z.enum(["ALL", "ADMINS", "VOLUNTEERS"]).optional()
});

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  const parsed = folderSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "文件夹信息不完整" }, { status: 400 });
  const name = validateResourceName(parsed.data.name);
  if (!name) return NextResponse.json({ message: "文件夹名称无效" }, { status: 400 });

  const project = await prisma.resourceProject.findUnique({ where: { id: parsed.data.projectId }, select: { id: true } });
  if (!project) return NextResponse.json({ message: "活动项目不存在" }, { status: 404 });
  const parentId = parsed.data.parentId || null;
  const parent = parentId ? await prisma.resourceFolder.findUnique({ where: { id: parentId } }) : null;
  if (parentId && (!parent || parent.projectId !== parsed.data.projectId)) return NextResponse.json({ message: "上级目录不存在" }, { status: 404 });
  if (parentId && !(await canAccessFolder(auth.user, parentId))) {
    return NextResponse.json({ message: "无权在此目录中新建文件夹" }, { status: 403 });
  }
  if (!(await ensureNameAvailable(parsed.data.projectId, parentId, name))) return NextResponse.json({ message: "当前目录已存在同名项目" }, { status: 409 });

  const folder = await prisma.resourceFolder.create({
    data: {
      name,
      projectId: parsed.data.projectId,
      parentId,
      visibility: auth.user.role === "volunteer" ? parent?.visibility ?? "ALL" : parsed.data.visibility ?? parent?.visibility ?? "ALL",
      createdById: auth.user.id
    }
  });
  try {
    await ensureResourceOriginalDirectory(parsed.data.projectId, folder.id);
    return NextResponse.json({ data: folder, message: "文件夹已创建" }, { status: 201 });
  } catch (error) {
    await prisma.resourceFolder.delete({ where: { id: folder.id } }).catch(() => undefined);
    return NextResponse.json({ message: error instanceof Error ? error.message : "磁盘目录创建失败" }, { status: 500 });
  }
}
