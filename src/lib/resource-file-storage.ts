/** 项目导读：资料中心文件读写分流：新文件走 OSS，迁移前的历史文件仍可从本地磁盘读取。 */
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  getResourceObjectMetadata,
  getResourceObjectStream,
  isResourceObjectKey,
  removeResourceObjects,
  resourceObjectExists
} from "@/lib/resource-object-storage";
import { ensureStorageReady, getStoredFile, getStoredUpload, removeStoredKeys, resolveStorageKey, storedFileExists } from "@/lib/resource-storage";

export async function getResourceFileMetadata(storageKey: string) {
  if (isResourceObjectKey(storageKey)) return getResourceObjectMetadata(storageKey);
  const details = await stat(resolveStorageKey(storageKey));
  if (!details.isFile()) throw new Error("资料文件不存在");
  return { size: details.size, lastModified: details.mtime };
}

export async function getResourceFile(storageKey: string, range?: { start: number; end: number }) {
  if (isResourceObjectKey(storageKey)) {
    const [{ size }, { stream }] = await Promise.all([
      getResourceObjectMetadata(storageKey),
      getResourceObjectStream(storageKey, range)
    ]);
    return { size, stream };
  }
  return getStoredFile(storageKey, range);
}

export function resourceFileExists(storageKey?: string | null) {
  return isResourceObjectKey(storageKey) ? resourceObjectExists(storageKey) : storedFileExists(storageKey);
}

export async function removeResourceStorageKeys(keys: Array<string | null | undefined>) {
  const ossKeys = keys.filter((key) => isResourceObjectKey(key));
  const localKeys = keys.filter((key) => key && !isResourceObjectKey(key));
  // 与旧的本地删除语义一致：数据库是权威，存储清理失败留给后续孤儿清理，不倒打业务删除。
  await Promise.all([removeResourceObjects(ossKeys).catch(() => undefined), removeStoredKeys(localKeys)]);
}

export async function getResourceUploadForPreview(storageKey: string, fileName: string) {
  if (!isResourceObjectKey(storageKey)) return { upload: await getStoredUpload(storageKey), cleanupKeys: [] as string[] };
  await ensureStorageReady();
  const extension = safeExtension(fileName);
  const temporaryKey = path.posix.join("temp", `resource-source-${randomUUID()}${extension}`);
  const absolutePath = resolveStorageKey(temporaryKey);
  const { stream } = await getResourceObjectStream(storageKey);
  try {
    await pipeline(stream as Readable, createWriteStream(absolutePath, { flags: "wx" }));
    return { upload: { storageKey: temporaryKey, absolutePath, extension }, cleanupKeys: [temporaryKey] };
  } catch (error) {
    await removeStoredKeys([temporaryKey]);
    throw error;
  }
}

function safeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : "";
}
