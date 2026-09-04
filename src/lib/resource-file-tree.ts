/** 项目导读：资料文件落盘逻辑：同时照顾数据库记录与磁盘路径；两边必须对得上账，不能一个说东一个说西。 */
import { prisma } from "@/lib/db";
import { isResourceObjectKey } from "@/lib/resource-object-storage";
import {
  ensureStoredDirectory,
  getOriginalDirectoryKey,
  getOriginalFileKey,
  moveStoredFile
} from "@/lib/resource-storage";

export async function getResourceOriginalDirectoryKey(projectId: string, folderId: string | null) {
  const project = await prisma.resourceProject.findUnique({ where: { id: projectId }, select: { name: true } });
  if (!project) throw new Error("活动项目不存在");
  const folderNames = await getFolderNames(folderId, projectId);
  return getOriginalDirectoryKey(project.name, folderNames);
}

export async function ensureResourceOriginalDirectory(projectId: string, folderId: string | null = null) {
  const directoryKey = await getResourceOriginalDirectoryKey(projectId, folderId);
  await ensureStoredDirectory(directoryKey);
  return directoryKey;
}

export async function getResourceOriginalFileKey(projectId: string, folderId: string | null, fileName: string) {
  const project = await prisma.resourceProject.findUnique({ where: { id: projectId }, select: { name: true } });
  if (!project) throw new Error("活动项目不存在");
  return getOriginalFileKey(project.name, await getFolderNames(folderId, projectId), fileName);
}

export async function synchronizeProjectOriginalTree(projectId: string) {
  const project = await prisma.resourceProject.findUnique({
    where: { id: projectId },
    include: { folders: true, files: true }
  });
  if (!project) throw new Error("活动项目不存在");

  const foldersById = new Map(project.folders.map((folder) => [folder.id, folder]));
  const namesByFolderId = new Map<string, string[]>();

  function resolveFolderNames(folderId: string | null, trail = new Set<string>()): string[] {
    if (!folderId) return [];
    const cached = namesByFolderId.get(folderId);
    if (cached) return cached;
    if (trail.has(folderId)) throw new Error("资料目录存在循环关系");
    const folder = foldersById.get(folderId);
    if (!folder) throw new Error("资料目录结构不完整");
    const nextTrail = new Set(trail).add(folderId);
    const names = [...resolveFolderNames(folder.parentId, nextTrail), folder.name];
    namesByFolderId.set(folderId, names);
    return names;
  }

  await ensureStoredDirectory(getOriginalDirectoryKey(project.name));
  for (const folder of project.folders) {
    await ensureStoredDirectory(getOriginalDirectoryKey(project.name, resolveFolderNames(folder.id)));
  }

  let moved = 0;
  for (const file of project.files) {
    if (!file.storageKey) continue;
    // OSS 使用稳定对象 Key，项目或文件夹改名时不搬运大文件。
    if (isResourceObjectKey(file.storageKey)) continue;
    const desiredKey = getOriginalFileKey(project.name, resolveFolderNames(file.folderId), file.fileName ?? file.title);
    if (file.storageKey === desiredKey) continue;
    const previousKey = file.storageKey;
    await moveStoredFile(previousKey, desiredKey);
    try {
      await prisma.fileResource.update({
        where: { id: file.id },
        data: {
          storageKey: desiredKey,
          previewKey: file.previewKey === previousKey ? desiredKey : undefined
        }
      });
      moved += 1;
    } catch (error) {
      await moveStoredFile(desiredKey, previousKey).catch(() => undefined);
      throw error;
    }
  }

  return { moved, folders: project.folders.length, files: project.files.length };
}

async function getFolderNames(folderId: string | null, projectId: string) {
  const names: string[] = [];
  let currentId = folderId;
  let depth = 0;
  while (currentId) {
    if (depth++ > 100) throw new Error("目录层级过深");
    const folder: { name: string; parentId: string | null; projectId: string | null } | null = await prisma.resourceFolder.findUnique({
      where: { id: currentId },
      select: { name: true, parentId: true, projectId: true }
    });
    if (!folder || folder.projectId !== projectId) throw new Error("目标目录不存在");
    names.unshift(folder.name);
    currentId = folder.parentId;
  }
  return names;
}
