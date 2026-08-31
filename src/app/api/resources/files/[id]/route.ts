/** 项目导读：接口路由 /api/resources/files/[id]：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { ensureNameAvailable, validateResourceName } from "@/lib/resource-drive";
import { getResourceOriginalFileKey } from "@/lib/resource-file-tree";
import { moveStoredFile, removeStoredKeys } from "@/lib/resource-storage";

const updateSchema = z.object({ name: z.string().optional(), parentId: z.string().nullable().optional() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const existing = await prisma.fileResource.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "文件不存在" }, { status: 404 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "修改内容无效" }, { status: 400 });
  const name = parsed.data.name === undefined ? existing.title : validateResourceName(parsed.data.name);
  if (!name) return NextResponse.json({ message: "文件名称无效" }, { status: 400 });
  const parentId = parsed.data.parentId === undefined ? existing.folderId : parsed.data.parentId || null;
  const targetFolder = parentId ? await prisma.resourceFolder.findUnique({ where: { id: parentId }, select: { id: true, projectId: true, visibility: true } }) : null;
  if (parentId && (!targetFolder || targetFolder.projectId !== existing.projectId)) {
    return NextResponse.json({ message: "目标目录不存在" }, { status: 404 });
  }
  if (!existing.projectId) return NextResponse.json({ message: "文件尚未归入活动项目" }, { status: 409 });
  if (!(await ensureNameAvailable(existing.projectId, parentId, name, { kind: "file", id }))) return NextResponse.json({ message: "目标目录已存在同名项目" }, { status: 409 });

  const nextStorageKey = existing.storageKey ? await getResourceOriginalFileKey(existing.projectId, parentId, name) : null;
  const storageChanged = Boolean(existing.storageKey && nextStorageKey && existing.storageKey !== nextStorageKey);
  try {
    if (storageChanged) await moveStoredFile(existing.storageKey!, nextStorageKey!);
    const file = await prisma.fileResource.update({
      where: { id },
      data: {
        title: name,
        fileName: name,
        folderId: parentId,
        visibility: targetFolder?.visibility ?? "ALL",
        storageKey: nextStorageKey ?? undefined,
        previewKey: existing.previewKey === existing.storageKey ? nextStorageKey : undefined
      }
    });
    return NextResponse.json({ data: file, message: "文件已更新" });
  } catch (error) {
    if (storageChanged) await moveStoredFile(nextStorageKey!, existing.storageKey!).catch(() => undefined);
    return NextResponse.json({ message: error instanceof Error ? error.message : "文件更新失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const file = await prisma.fileResource.findUnique({ where: { id }, select: { storageKey: true, previewKey: true, posterKey: true } });
  if (!file) return NextResponse.json({ message: "文件不存在" }, { status: 404 });
  await prisma.fileResource.delete({ where: { id } });
  await removeStoredKeys([file.storageKey, file.previewKey, file.posterKey]);
  return NextResponse.json({ message: "文件已永久删除" });
}
