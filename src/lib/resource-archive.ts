/** 项目导读：资料打包下载：把选中的文件和文件夹流式装进 ZIP；边读边发，不让服务器一次吞下整桌菜。 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { PassThrough, Readable } from "node:stream";
import archiver from "archiver";
import { prisma } from "@/lib/db";
import { canAccessFolder, getAccessibleFile } from "@/lib/resource-drive";
import { resolveStorageKey } from "@/lib/resource-storage";
import type { CurrentUser } from "@/types/user";

export type ResourceArchiveSelection = { kind: "file" | "folder"; id: string };

type ArchiveEntry = {
  absolutePath?: string;
  archivePath: string;
  directory?: boolean;
};

const MAX_SELECTIONS = 200;
const MAX_ARCHIVE_ENTRIES = 10_000;

export class ResourceArchiveError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function createResourceArchive(user: CurrentUser, selections: ResourceArchiveSelection[], preferredName = "资料批量下载.zip") {
  const normalized = deduplicateSelections(selections);
  if (!normalized.length) throw new ResourceArchiveError("请至少选择一个文件或文件夹", 400);
  if (normalized.length > MAX_SELECTIONS) throw new ResourceArchiveError(`单次最多选择 ${MAX_SELECTIONS} 项`, 400);

  const entries: ArchiveEntry[] = [];
  const includedFiles = new Set<string>();
  const rootNames = new Set<string>();

  for (const selection of normalized) {
    if (selection.kind === "file") {
      const file = await getAccessibleFile(user, selection.id);
      if (!file) throw new ResourceArchiveError("部分文件不存在或无权访问，请刷新后重试", 404);
      if (includedFiles.has(file.id)) continue;
      const fileName = uniqueArchiveName(safeArchiveSegment(file.fileName ?? file.title), rootNames);
      const entry = await storedFileEntry(file.storageKey, fileName);
      if (entry) {
        entries.push(entry);
        includedFiles.add(file.id);
      }
      continue;
    }

    const folder = await prisma.resourceFolder.findUnique({
      where: { id: selection.id },
      select: { id: true, name: true, projectId: true }
    });
    if (!folder || !folder.projectId || !(await canAccessFolder(user, folder.id))) {
      throw new ResourceArchiveError("部分文件夹不存在或无权访问，请刷新后重试", 404);
    }

    const rootName = uniqueArchiveName(safeArchiveSegment(folder.name), rootNames);
    const folderPaths = await collectAccessibleFolderPaths(user, folder.id, rootName);
    for (const archivePath of folderPaths.values()) entries.push({ archivePath: `${archivePath}/`, directory: true });

    const files = await prisma.fileResource.findMany({
      where: { folderId: { in: [...folderPaths.keys()] } },
      select: { id: true, folderId: true, storageKey: true, fileName: true, title: true }
    });
    for (const file of files) {
      if (includedFiles.has(file.id) || !file.folderId) continue;
      const folderPath = folderPaths.get(file.folderId);
      if (!folderPath) continue;
      const entry = await storedFileEntry(file.storageKey, path.posix.join(folderPath, safeArchiveSegment(file.fileName ?? file.title)));
      if (entry) {
        entries.push(entry);
        includedFiles.add(file.id);
      }
    }

    if (entries.length > MAX_ARCHIVE_ENTRIES) throw new ResourceArchiveError(`单次打包不能超过 ${MAX_ARCHIVE_ENTRIES} 个文件和文件夹`, 413);
  }

  if (!entries.some((entry) => !entry.directory)) {
    throw new ResourceArchiveError("所选内容中没有可下载的本地文件", 409);
  }

  const output = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 6 }, forceZip64: true });
  archive.on("warning", (error) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") output.destroy(error);
  });
  archive.on("error", (error) => output.destroy(error));
  archive.pipe(output);

  for (const entry of entries) {
    if (entry.directory) archive.append(Buffer.alloc(0), { name: entry.archivePath });
    else if (entry.absolutePath) archive.append(createReadStream(entry.absolutePath), { name: entry.archivePath });
  }
  void archive.finalize();

  return {
    fileName: normalizeZipName(preferredName),
    fileCount: includedFiles.size,
    stream: Readable.toWeb(output) as ReadableStream<Uint8Array>
  };
}

async function collectAccessibleFolderPaths(user: CurrentUser, rootId: string, rootName: string) {
  const paths = new Map<string, string>([[rootId, rootName]]);
  const queue = [rootId];
  for (let index = 0; index < queue.length; index += 1) {
    const parentId = queue[index];
    const children = await prisma.resourceFolder.findMany({
      where: { parentId },
      select: { id: true, name: true }
    });
    for (const child of children) {
      if (!(await canAccessFolder(user, child.id))) continue;
      const parentPath = paths.get(parentId);
      if (!parentPath) continue;
      paths.set(child.id, path.posix.join(parentPath, safeArchiveSegment(child.name)));
      queue.push(child.id);
    }
    if (paths.size > MAX_ARCHIVE_ENTRIES) throw new ResourceArchiveError(`单次打包不能超过 ${MAX_ARCHIVE_ENTRIES} 个文件和文件夹`, 413);
  }
  return paths;
}

async function storedFileEntry(storageKey: string | null, archivePath: string): Promise<ArchiveEntry | null> {
  if (!storageKey) return null;
  const absolutePath = resolveStorageKey(storageKey);
  try {
    const metadata = await stat(absolutePath);
    if (!metadata.isFile()) return null;
    return { absolutePath, archivePath };
  } catch {
    return null;
  }
}

function deduplicateSelections(selections: ResourceArchiveSelection[]) {
  const seen = new Set<string>();
  return selections.filter((selection) => {
    if (!selection || !["file", "folder"].includes(selection.kind) || typeof selection.id !== "string" || !selection.id.trim()) return false;
    const key = `${selection.kind}:${selection.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeArchiveSegment(value: string) {
  const sanitized = value.trim().replace(/[\\/\u0000-\u001f]/g, "_");
  return !sanitized || sanitized === "." || sanitized === ".." ? "未命名资料" : sanitized;
}

function uniqueArchiveName(name: string, used: Set<string>) {
  let candidate = name;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${name} (${suffix++})`;
  used.add(candidate);
  return candidate;
}

function normalizeZipName(value: string) {
  const base = safeArchiveSegment(value).replace(/\.zip$/i, "");
  return `${base}.zip`;
}

export function archiveContentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
