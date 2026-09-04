/** 项目导读：接口路由 /api/resources/folders/[id]：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { collectFolderTree, ensureNameAvailable, validateResourceName, wouldCreateFolderCycle } from "@/lib/resource-drive";
import { removeResourceStorageKeys } from "@/lib/resource-file-storage";
import { getResourceOriginalDirectoryKey, synchronizeProjectOriginalTree } from "@/lib/resource-file-tree";
import { removeStoredDirectory } from "@/lib/resource-storage";

const updateSchema = z.object({
  name: z.string().optional(),
  parentId: z.string().nullable().optional(),
  visibility: z.enum(["ALL", "ADMINS", "VOLUNTEERS"]).optional()
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const existing = await prisma.resourceFolder.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ message: "文件夹不存在" }, { status: 404 });
  const folderIds = await collectFolderTree(id);
  const fileCount = await prisma.fileResource.count({ where: { folderId: { in: folderIds } } });
  return NextResponse.json({ data: { folderCount: folderIds.length, fileCount } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const existing = await prisma.resourceFolder.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "文件夹不存在" }, { status: 404 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "修改内容无效" }, { status: 400 });
  const name = parsed.data.name === undefined ? existing.name : validateResourceName(parsed.data.name);
  if (!name) return NextResponse.json({ message: "文件夹名称无效" }, { status: 400 });
  const parentId = parsed.data.parentId === undefined ? existing.parentId : parsed.data.parentId || null;
  const targetParent = parentId ? await prisma.resourceFolder.findUnique({ where: { id: parentId }, select: { id: true, projectId: true } }) : null;
  if (parentId && (!targetParent || targetParent.projectId !== existing.projectId)) {
    return NextResponse.json({ message: "目标目录不存在" }, { status: 404 });
  }
  if (await wouldCreateFolderCycle(id, parentId)) return NextResponse.json({ message: "不能移动到自身或下级目录" }, { status: 400 });
  if (!existing.projectId) return NextResponse.json({ message: "文件夹尚未归入活动项目" }, { status: 409 });
  if (!(await ensureNameAvailable(existing.projectId, parentId, name, { kind: "folder", id }))) return NextResponse.json({ message: "目标目录已存在同名项目" }, { status: 409 });

  const oldDirectoryKey = await getResourceOriginalDirectoryKey(existing.projectId, existing.id);
  const folder = await prisma.resourceFolder.update({ where: { id }, data: { name, parentId, visibility: parsed.data.visibility } });
  try {
    await synchronizeProjectOriginalTree(existing.projectId);
    const newDirectoryKey = await getResourceOriginalDirectoryKey(existing.projectId, existing.id);
    if (oldDirectoryKey !== newDirectoryKey) await removeStoredDirectory(oldDirectoryKey);
    return NextResponse.json({ data: folder, message: "文件夹已更新" });
  } catch (error) {
    await prisma.resourceFolder.update({
      where: { id },
      data: { name: existing.name, parentId: existing.parentId, visibility: existing.visibility }
    }).catch(() => undefined);
    await synchronizeProjectOriginalTree(existing.projectId).catch(() => undefined);
    return NextResponse.json({ message: error instanceof Error ? error.message : "磁盘目录同步失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const existing = await prisma.resourceFolder.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ message: "文件夹不存在" }, { status: 404 });

  const folder = await prisma.resourceFolder.findUnique({ where: { id }, select: { id: true, projectId: true } });
  if (!folder?.projectId) return NextResponse.json({ message: "文件夹尚未归入活动项目" }, { status: 409 });
  const directoryKey = await getResourceOriginalDirectoryKey(folder.projectId, id);
  const folderIds = await collectFolderTree(id);
  const files = await prisma.fileResource.findMany({ where: { folderId: { in: folderIds } }, select: { storageKey: true, previewKey: true, posterKey: true } });
  const [folderCount, fileCount] = [folderIds.length, files.length];
  await prisma.resourceFolder.delete({ where: { id } });
  await removeResourceStorageKeys(files.flatMap((file) => [file.storageKey, file.previewKey, file.posterKey]));
  await removeStoredDirectory(directoryKey);
  return NextResponse.json({ message: `已永久删除 ${folderCount} 个文件夹和 ${fileCount} 个文件` });
}
