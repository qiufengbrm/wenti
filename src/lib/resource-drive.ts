/** 项目导读：共享工具 resource-drive：集中处理跨页面复用的规则；一处写清楚，省得各页面重复发明轮子。 */
import type { ResourceVisibility, Visibility } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CurrentUser } from "@/types/user";

export const resourceVisibilityLabels: Record<ResourceVisibility, string> = {
  ALL: "全体可见",
  ADMINS: "仅管理员",
  VOLUNTEERS: "仅志愿者"
};

export function validateResourceName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || name.length > 255 || name === "." || name === ".." || /[\\/\u0000-\u001f]/.test(name)) return null;
  return name;
}

export function parseResourceProjectDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export async function canAccessFolder(user: CurrentUser, folderId: string | null) {
  if (!folderId || user.role !== "volunteer") return true;
  let currentId: string | null = folderId;
  let depth = 0;

  while (currentId) {
    if (depth++ > 100) return false;
    const folder: { parentId: string | null; visibility: ResourceVisibility } | null = await prisma.resourceFolder.findUnique({
      where: { id: currentId },
      select: { parentId: true, visibility: true }
    });
    if (!folder || folder.visibility === "ADMINS") return false;
    currentId = folder.parentId;
  }

  return true;
}

export async function getAccessibleFile(user: CurrentUser, id: string) {
  const file = await prisma.fileResource.findUnique({ where: { id } });
  if (!file) return null;

  if (file.folderId) return (await canAccessFolder(user, file.folderId)) ? file : null;
  if (user.role !== "volunteer") return file;
  return legacyVisibilityAllowsVolunteer(file.visibility) ? file : null;
}

export async function ensureNameAvailable(projectId: string, parentId: string | null, name: string, exclude?: { kind: "file" | "folder"; id: string }) {
  const [folder, file] = await Promise.all([
    prisma.resourceFolder.findFirst({
      where: { projectId, parentId, name, NOT: exclude?.kind === "folder" ? { id: exclude.id } : undefined },
      select: { id: true }
    }),
    prisma.fileResource.findFirst({
      where: { projectId, folderId: parentId, title: name, NOT: exclude?.kind === "file" ? { id: exclude.id } : undefined },
      select: { id: true }
    })
  ]);
  return !folder && !file;
}

export async function getBreadcrumbs(projectId: string, folderId: string | null) {
  const project = await prisma.resourceProject.findUnique({ where: { id: projectId }, select: { name: true } });
  const breadcrumbs: Array<{ id: string | null; name: string }> = [];
  let currentId = folderId;
  let depth = 0;

  while (currentId) {
    if (depth++ > 100) throw new Error("目录层级过深");
    const folder: { id: string; name: string; parentId: string | null } | null = await prisma.resourceFolder.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true }
    });
    if (!folder) break;
    breadcrumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }

  return [{ id: null, name: project?.name ?? "活动项目" }, ...breadcrumbs];
}

export async function wouldCreateFolderCycle(folderId: string, targetParentId: string | null) {
  let currentId = targetParentId;
  let depth = 0;
  while (currentId) {
    if (currentId === folderId || depth++ > 100) return true;
    const folder: { parentId: string | null } | null = await prisma.resourceFolder.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });
    if (!folder) return false;
    currentId = folder.parentId;
  }
  return false;
}

export async function collectFolderTree(folderId: string) {
  const folderIds = [folderId];
  for (let index = 0; index < folderIds.length; index += 1) {
    const children = await prisma.resourceFolder.findMany({ where: { parentId: folderIds[index] }, select: { id: true } });
    folderIds.push(...children.map((child) => child.id));
  }
  return folderIds;
}

function legacyVisibilityAllowsVolunteer(visibility: Visibility) {
  return visibility === "ALL" || visibility === "VOLUNTEERS";
}
