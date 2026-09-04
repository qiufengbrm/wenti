/** 项目导读：将 FileResource 引用的本地文件逐条复制到 OSS，校验后再切换数据库 Key，不删除本地备份。 */
import { stat } from "node:fs/promises";
import path from "node:path";
import OSS from "ali-oss";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const storageRoot = path.resolve(requiredEnv("FILE_STORAGE_ROOT"));
const prefix = (process.env.OSS_PREFIX?.trim().replace(/^\/+|\/+$/g, "") || "resource-center");
const client = new OSS({
  accessKeyId: requiredEnv("OSS_ACCESS_KEY_ID"),
  accessKeySecret: requiredEnv("OSS_ACCESS_KEY_SECRET"),
  bucket: requiredEnv("OSS_BUCKET"),
  endpoint: requiredEnv("OSS_ENDPOINT"),
  region: requiredEnv("OSS_REGION"),
  authorizationV4: true,
  secure: true,
  timeout: 120_000
});

let migrated = 0;
let skipped = 0;
let missing = 0;

try {
  const files = await prisma.fileResource.findMany({
    where: { storageKey: { not: null } },
    select: { id: true, title: true, fileName: true, fileType: true, storageKey: true, previewKey: true, posterKey: true },
    orderBy: { createdAt: "asc" }
  });

  for (const file of files) {
    if (!file.storageKey || isOssKey(file.storageKey)) {
      skipped += 1;
      continue;
    }

    const originalPath = resolveLocalKey(file.storageKey);
    if (!(await localFileSize(originalPath))) {
      missing += 1;
      console.warn(`[缺失] ${file.id} ${file.fileName ?? file.title}`);
      continue;
    }

    const mapped = new Map();
    mapped.set(file.storageKey, objectKey("originals", file.id, file.fileName ?? file.title));
    if (file.previewKey === file.storageKey) mapped.set(file.previewKey, mapped.get(file.storageKey));
    else if (file.previewKey) mapped.set(file.previewKey, objectKey("previews", file.id, `preview${safeExtension(file.previewKey)}`));
    if (file.posterKey) mapped.set(file.posterKey, objectKey("previews", file.id, "poster.jpg"));

    if (dryRun) {
      migrated += 1;
      console.log(`[预演] ${file.id} ${file.fileName ?? file.title}`);
      continue;
    }

    const createdKeys = [];
    try {
      for (const [sourceKey, destinationKey] of mapped) {
        const absolutePath = resolveLocalKey(sourceKey);
        const size = await localFileSize(absolutePath);
        if (size === null) {
          mapped.delete(sourceKey);
          continue;
        }
        const existed = await ensureObject(destinationKey, absolutePath, size, contentTypeFor(sourceKey, file));
        if (!existed) createdKeys.push(destinationKey);
      }

      await prisma.fileResource.update({
        where: { id: file.id },
        data: {
          storageKey: mapped.get(file.storageKey),
          previewKey: file.previewKey ? mapped.get(file.previewKey) ?? file.previewKey : null,
          posterKey: file.posterKey ? mapped.get(file.posterKey) ?? file.posterKey : null
        }
      });
      migrated += 1;
      console.log(`[完成] ${file.id} ${file.fileName ?? file.title}`);
    } catch (error) {
      if (createdKeys.length) await client.deleteMulti(createdKeys, { quiet: true }).catch(() => undefined);
      throw error;
    }
  }

  console.log(JSON.stringify({ dryRun, migrated, skipped, missing, total: files.length }));
} finally {
  await prisma.$disconnect();
}

async function ensureObject(destinationKey, absolutePath, size, contentType) {
  try {
    const result = await client.head(destinationKey);
    const remoteSize = Number(result.res.headers["content-length"]);
    if (remoteSize !== size) throw new Error(`OSS 目标已存在且大小不一致：${destinationKey}`);
    return true;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  let uploadedNow = false;
  try {
    await client.put(destinationKey, absolutePath, {
      mime: contentType,
      headers: { "x-oss-forbid-overwrite": "true" }
    });
    uploadedNow = true;
    const uploaded = await client.head(destinationKey);
    if (Number(uploaded.res.headers["content-length"]) !== size) throw new Error(`OSS 上传校验失败：${destinationKey}`);
    return false;
  } catch (error) {
    if (uploadedNow) await client.delete(destinationKey).catch(() => undefined);
    throw error;
  }
}

function objectKey(kind, id, fileName) {
  const name = path.basename(fileName).trim().replace(/[\\/\u0000-\u001f]/g, "_") || "unnamed-file";
  return `${prefix}/${kind}/${id}/${name}`;
}

function resolveLocalKey(storageKey) {
  const resolved = path.resolve(storageRoot, storageKey);
  if (resolved !== storageRoot && !resolved.startsWith(`${storageRoot}${path.sep}`)) throw new Error(`非法本地存储路径：${storageKey}`);
  return resolved;
}

async function localFileSize(absolutePath) {
  try {
    const details = await stat(absolutePath);
    return details.isFile() ? details.size : null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function contentTypeFor(storageKey, file) {
  if (storageKey === file.storageKey) return file.fileType || "application/octet-stream";
  const extension = safeExtension(storageKey);
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".mp4") return "video/mp4";
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  return "application/octet-stream";
}

function safeExtension(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : "";
}

function isOssKey(storageKey) {
  return storageKey.startsWith(`${prefix}/`);
}

function isNotFound(error) {
  return error?.status === 404 || error?.statusCode === 404 || error?.code === "NoSuchKey";
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`未配置 ${name}`);
  return value;
}
