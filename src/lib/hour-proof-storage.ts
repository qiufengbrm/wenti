/** 项目导读：志愿时长证明存储分流：新证明走 OSS，老证明仍能从本地磁盘读取和清理。 */
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  createResourceObjectKey,
  getResourceObjectMetadata,
  getResourceObjectStream,
  isResourceObjectKey,
  isResourceObjectStorageEnabled,
  putResourceObjectFromPath,
  removeResourceObjects,
  resourceObjectExists
} from "@/lib/resource-object-storage";
import { ensureStorageReady, getStoredFile, getStoredUpload, removeStoredKeys, resolveStorageKey, storedFileExists, storeUploadedFile } from "@/lib/resource-storage";
import type { HourProofSource } from "@/lib/hour-proof-preview";

export function isHourProofObjectStorageEnabled() {
  return isResourceObjectStorageEnabled();
}

export function createHourProofOriginalObjectKey(source: HourProofSource, userId: string, recordId: string, fileName: string) {
  const directory = source === "direct" ? "hour-proofs" : "task-proofs";
  return createResourceObjectKey("originals", `${directory}/${safeObjectSegment(userId)}/${safeObjectSegment(recordId)}`, fileName);
}

export function getHourProofArtifactStorageKeys(source: HourProofSource, id: string, ownerStorageKey?: string | null) {
  const base = `proof-previews/${source}/${safeObjectSegment(id)}`;
  const names = ["preview.jpg", "preview.mp4", "preview.pdf", "poster.jpg"];
  if (ownerStorageKey && isResourceObjectKey(ownerStorageKey)) {
    return names.map((name) => createResourceObjectKey("previews", base, name));
  }
  return names.map((name) => path.posix.join(base, name));
}

export async function putHourProofObjectFromPath(storageKey: string, absolutePath: string, contentType: string) {
  return putResourceObjectFromPath(storageKey, absolutePath, contentType);
}

export async function storeHourProofUploadedFile(file: File, storageKey: string) {
  return storeUploadedFile(file, storageKey);
}

export async function getHourProofFile(storageKey: string, range?: { start: number; end: number }) {
  if (isResourceObjectKey(storageKey)) {
    const [{ size }, { stream }] = await Promise.all([
      getResourceObjectMetadata(storageKey),
      getResourceObjectStream(storageKey, range)
    ]);
    return { size, stream };
  }
  return getStoredFile(storageKey, range);
}

export function hourProofFileExists(storageKey?: string | null) {
  return isResourceObjectKey(storageKey) ? resourceObjectExists(storageKey) : storedFileExists(storageKey);
}

export async function getHourProofUploadForPreview(storageKey: string, fileName: string) {
  if (!isResourceObjectKey(storageKey)) return { upload: await getStoredUpload(storageKey), cleanupKeys: [] as string[] };
  await ensureStorageReady();
  const temporaryKey = path.posix.join("temp", `hour-proof-source-${randomUUID()}${safeExtension(fileName)}`);
  const absolutePath = resolveStorageKey(temporaryKey);
  const { stream } = await getResourceObjectStream(storageKey);
  try {
    await pipeline(stream as Readable, createWriteStream(absolutePath, { flags: "wx" }));
    return { upload: { storageKey: temporaryKey, absolutePath, extension: safeExtension(fileName) }, cleanupKeys: [temporaryKey] };
  } catch (error) {
    await removeStoredKeys([temporaryKey]);
    throw error;
  }
}

export async function removeHourProofStorageKeys(keys: Array<string | null | undefined>) {
  const ossKeys = keys.filter((key) => isResourceObjectKey(key));
  const localKeys = keys.filter((key) => key && !isResourceObjectKey(key));
  await Promise.all([removeResourceObjects(ossKeys).catch(() => undefined), removeStoredKeys(localKeys)]);
}

function safeObjectSegment(value: string) {
  const segment = value.trim().replace(/[\\/\u0000-\u001f]/g, "_");
  if (!segment || segment === "." || segment === ".." || segment.includes("..")) throw new Error("证明材料路径无效");
  return segment;
}

function safeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : "";
}
