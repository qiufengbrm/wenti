/** 项目导读：维护脚本 sync-resource-storage-tree：先确认路径和 dry-run 结果再动手，硬盘里的文件不是野菜，不能随便薅。 */
import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import prismaPackage from "@prisma/client";

const { loadEnvConfig } = nextEnv;
const { PrismaClient } = prismaPackage;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const dryRun = process.argv.includes("--dry-run");
const storageRoot = resolveSafeStorageRoot(process.env.FILE_STORAGE_ROOT);
const originalsRoot = path.join(storageRoot, "originals");
const prisma = new PrismaClient();

try {
  const projects = await prisma.resourceProject.findMany({ include: { folders: true, files: true } });
  const summary = { projects: projects.length, folders: 0, files: 0, moved: 0, unchanged: 0, legacyLinks: 0, missing: 0 };

  for (const project of projects) {
    assertSegment(project.name);
    const foldersById = new Map(project.folders.map((folder) => [folder.id, folder]));
    const cachedNames = new Map();
    const folderNames = (folderId, trail = new Set()) => {
      if (!folderId) return [];
      if (cachedNames.has(folderId)) return cachedNames.get(folderId);
      if (trail.has(folderId)) throw new Error(`项目“${project.name}”存在循环目录`);
      const folder = foldersById.get(folderId);
      if (!folder) throw new Error(`项目“${project.name}”的目录结构不完整`);
      assertSegment(folder.name);
      const names = [...folderNames(folder.parentId, new Set(trail).add(folderId)), folder.name];
      cachedNames.set(folderId, names);
      return names;
    };

    const projectDirectory = path.join(originalsRoot, project.name);
    if (!dryRun) await fs.mkdir(projectDirectory, { recursive: true });
    for (const folder of project.folders) {
      const directory = path.join(projectDirectory, ...folderNames(folder.id));
      if (!dryRun) await fs.mkdir(directory, { recursive: true });
    }
    summary.folders += project.folders.length;

    for (const file of project.files) {
      summary.files += 1;
      if (!file.storageKey) {
        summary.legacyLinks += 1;
        continue;
      }
      const fileName = file.fileName ?? file.title;
      assertSegment(fileName);
      const desiredKey = path.posix.join("originals", project.name, ...folderNames(file.folderId), fileName);
      if (file.storageKey === desiredKey) {
        summary.unchanged += 1;
        continue;
      }

      const sourcePath = resolveStorageKey(file.storageKey);
      const destinationPath = resolveStorageKey(desiredKey);
      const [sourceExists, destinationExists] = await Promise.all([isFile(sourcePath), isFile(destinationPath)]);
      if (!sourceExists && !destinationExists) {
        summary.missing += 1;
        console.warn(`跳过缺失文件：${file.storageKey}`);
        continue;
      }
      if (sourceExists && destinationExists) throw new Error(`目标文件已存在，拒绝覆盖：${desiredKey}`);

      if (!dryRun && sourceExists) {
        await fs.mkdir(path.dirname(destinationPath), { recursive: true });
        await fs.rename(sourcePath, destinationPath);
      }
      if (!dryRun) {
        try {
          await prisma.fileResource.update({
            where: { id: file.id },
            data: { storageKey: desiredKey, previewKey: file.previewKey === file.storageKey ? desiredKey : undefined }
          });
        } catch (error) {
          if (sourceExists) await fs.rename(destinationPath, sourcePath).catch(() => undefined);
          throw error;
        }
      }
      summary.moved += 1;
    }
  }

  console.log(JSON.stringify({ dryRun, storageRoot, ...summary }, null, 2));
} finally {
  await prisma.$disconnect();
}

function resolveSafeStorageRoot(value) {
  if (!value?.trim()) throw new Error("未配置 FILE_STORAGE_ROOT");
  const resolved = path.resolve(value.trim());
  if (resolved === path.parse(resolved).root) throw new Error("拒绝使用文件系统根目录作为资料库");
  return resolved;
}

function resolveStorageKey(storageKey) {
  const resolved = path.resolve(storageRoot, storageKey);
  if (resolved !== storageRoot && !resolved.startsWith(`${storageRoot}${path.sep}`)) throw new Error("非法存储路径");
  return resolved;
}

function assertSegment(value) {
  if (!value || value === "." || value === ".." || /[\\/\u0000-\u001f]/.test(value)) throw new Error(`无法用于磁盘路径的资料名称：${value}`);
}

async function isFile(filePath) {
  const details = await fs.stat(filePath).catch(() => null);
  return Boolean(details?.isFile());
}
