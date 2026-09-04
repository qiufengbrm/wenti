/** 项目导读：接口路由 /api/resources/projects/[id]：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { parseResourceProjectDate, validateResourceName } from "@/lib/resource-drive";
import { removeResourceStorageKeys } from "@/lib/resource-file-storage";
import { synchronizeProjectOriginalTree } from "@/lib/resource-file-tree";
import { getOriginalDirectoryKey, removeStoredDirectory } from "@/lib/resource-storage";

const updateSchema = z.object({ name: z.string().optional(), description: z.string().max(2000).nullable().optional(), projectDate: z.string().optional() });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const project = await prisma.resourceProject.findUnique({
    where: { id },
    select: { id: true, _count: { select: { folders: true, files: true } } }
  });
  if (!project) return NextResponse.json({ message: "活动项目不存在" }, { status: 404 });
  return NextResponse.json({ data: { folderCount: project._count.folders, fileCount: project._count.files } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const existing = await prisma.resourceProject.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "活动项目不存在" }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "修改内容无效" }, { status: 400 });
  const name = parsed.data.name === undefined ? existing.name : validateResourceName(parsed.data.name);
  if (!name) return NextResponse.json({ message: "项目名称无效" }, { status: 400 });
  const projectDate = parsed.data.projectDate === undefined ? undefined : parseResourceProjectDate(parsed.data.projectDate);
  if (parsed.data.projectDate !== undefined && !projectDate) return NextResponse.json({ message: "项目日期无效" }, { status: 400 });
  const duplicate = await prisma.resourceProject.findFirst({ where: { name, NOT: { id } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ message: "已存在同名活动项目" }, { status: 409 });
  const oldDirectoryKey = getOriginalDirectoryKey(existing.name);
  const project = await prisma.resourceProject.update({
    where: { id },
    data: { name, description: parsed.data.description === undefined ? undefined : parsed.data.description?.trim() || null, createdAt: projectDate ?? undefined }
  });
  try {
    await synchronizeProjectOriginalTree(id);
    const newDirectoryKey = getOriginalDirectoryKey(name);
    if (oldDirectoryKey !== newDirectoryKey) await removeStoredDirectory(oldDirectoryKey);
    return NextResponse.json({ data: project, message: "活动项目已更新" });
  } catch (error) {
    await prisma.resourceProject.update({
      where: { id },
      data: { name: existing.name, description: existing.description, createdAt: existing.createdAt }
    }).catch(() => undefined);
    await synchronizeProjectOriginalTree(id).catch(() => undefined);
    return NextResponse.json({ message: error instanceof Error ? error.message : "项目磁盘目录同步失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const project = await prisma.resourceProject.findUnique({
    where: { id },
    include: { files: { select: { storageKey: true, previewKey: true, posterKey: true } }, _count: { select: { folders: true, files: true } } }
  });
  if (!project) return NextResponse.json({ message: "活动项目不存在" }, { status: 404 });
  const directoryKey = getOriginalDirectoryKey(project.name);
  await prisma.resourceProject.delete({ where: { id } });
  await removeResourceStorageKeys(project.files.flatMap((file) => [file.storageKey, file.previewKey, file.posterKey]));
  await removeStoredDirectory(directoryKey);
  return NextResponse.json({ message: `已永久删除项目及其中 ${project._count.folders} 个文件夹、${project._count.files} 个文件` });
}
