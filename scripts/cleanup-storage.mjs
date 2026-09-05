/** 项目导读：维护脚本 cleanup-storage：先确认路径和 dry-run 结果再动手，硬盘里的文件不是野菜，不能随便薅。 */
import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import prismaPackage from "@prisma/client";
import OSS from "ali-oss";

const { loadEnvConfig } = nextEnv;
const { PrismaClient } = prismaPackage;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const dryRun = process.argv.includes("--dry-run");
const storageRoot = resolveSafeStorageRoot(process.env.FILE_STORAGE_ROOT);
const tempRetentionHours = readPositiveNumber("TEMP_FILE_RETENTION_HOURS", 24);
const orphanPreviewRetentionDays = readPositiveNumber("ORPHAN_PREVIEW_RETENTION_DAYS", 7);
const officePreviewRetentionDays = readPositiveNumber("OFFICE_PREVIEW_RETENTION_DAYS", 7);
const tutorialImageRetentionHours = readPositiveNumber("TUTORIAL_INLINE_IMAGE_RETENTION_HOURS", 24);
const now = Date.now();
const prisma = new PrismaClient();
let ossClient = null;

try {
  const expiredOfficePreviewResult = await cleanExpiredOfficePreviews(
    now - officePreviewRetentionDays * 24 * 60 * 60 * 1000
  );
  const files = await prisma.fileResource.findMany({
    select: { storageKey: true, previewKey: true, posterKey: true }
  });
  const referencedKeys = new Set(
    files.flatMap((file) => [file.storageKey, file.previewKey, file.posterKey]).filter(Boolean)
  );

  const tempResult = await cleanExpiredTempEntries(
    path.join(storageRoot, "temp"),
    now - tempRetentionHours * 60 * 60 * 1000
  );
  const previewResult = await cleanOrphanPreviews(
    path.join(storageRoot, "previews"),
    referencedKeys,
    now - orphanPreviewRetentionDays * 24 * 60 * 60 * 1000
  );
  const tutorialImageResult = await cleanAbandonedTutorialImages(
    now - tutorialImageRetentionHours * 60 * 60 * 1000
  );

  console.log(JSON.stringify({
    dryRun,
    storageRoot,
    retention: {
      tempHours: tempRetentionHours,
      orphanPreviewDays: orphanPreviewRetentionDays,
      officePreviewDays: officePreviewRetentionDays,
      tutorialInlineImageHours: tutorialImageRetentionHours
    },
    expiredOfficePreviews: expiredOfficePreviewResult,
    temp: tempResult,
    orphanPreviews: previewResult,
    abandonedTutorialImages: tutorialImageResult
  }, null, 2));
} finally {
  await prisma.$disconnect();
}

async function cleanExpiredOfficePreviews(expiresBefore) {
  const files = await prisma.fileResource.findMany({
    where: { previewKey: { not: null } },
    select: { id: true, fileName: true, fileType: true, storageKey: true, previewKey: true, posterKey: true }
  });
  let candidates = 0;
  let removed = 0;

  for (const file of files) {
    if (!file.previewKey || file.previewKey === file.storageKey || !isOfficeFile(file.fileName, file.fileType)) continue;
    const lastModified = await getStorageLastModified(file.previewKey).catch(() => null);
    if (!lastModified || lastModified.getTime() >= expiresBefore) continue;
    candidates += 1;
    if (dryRun) continue;

    await removeStorageKeys([file.previewKey, file.posterKey]);
    const cleared = await prisma.fileResource.updateMany({
      where: { id: file.id, previewKey: file.previewKey },
      data: { previewKey: null, posterKey: null, previewStatus: "NONE" }
    });
    if (!cleared.count) continue;
    removed += 1;
  }

  return { scanned: files.length, candidates, removed };
}

async function cleanExpiredTempEntries(directory, expiresBefore) {
  const entries = await readDirectoryOrEmpty(directory);
  let candidates = 0;
  let removed = 0;

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const details = await fs.stat(absolutePath).catch(() => null);
    if (!details || details.mtimeMs >= expiresBefore) continue;
    candidates += 1;
    if (!dryRun) {
      await fs.rm(absolutePath, { recursive: true, force: true });
      removed += 1;
    }
  }

  return { scanned: entries.length, candidates, removed };
}

async function cleanOrphanPreviews(directory, referencedKeys, expiresBefore) {
  const entries = await readDirectoryOrEmpty(directory);
  let candidates = 0;
  let removed = 0;
  let preserved = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const storageKey = path.posix.join("previews", entry.name);
    if (referencedKeys.has(storageKey)) {
      preserved += 1;
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    const details = await fs.stat(absolutePath).catch(() => null);
    if (!details || details.mtimeMs >= expiresBefore) continue;
    candidates += 1;
    if (!dryRun) {
      await fs.rm(absolutePath, { force: true });
      removed += 1;
    }
  }

  return { scanned: entries.filter((entry) => entry.isFile()).length, preserved, candidates, removed };
}

async function cleanAbandonedTutorialImages(expiresBefore) {
  const candidates = await prisma.tutorialInlineImage.findMany({
    where: { tutorialId: null, createdAt: { lt: new Date(expiresBefore) } },
    select: { id: true, storageKey: true }
  });
  if (dryRun || candidates.length === 0) return { candidates: candidates.length, removed: 0 };

  let removed = 0;
  for (const image of candidates) {
    const deleted = await prisma.tutorialInlineImage.deleteMany({ where: { id: image.id, tutorialId: null } });
    if (!deleted.count) continue;
    await removeStorageKey(image.storageKey);
    removed += 1;
  }
  return { candidates: candidates.length, removed };
}

async function removeStorageKey(storageKey) {
  const absolutePath = path.resolve(storageRoot, storageKey);
  if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error(`拒绝清理存储根目录外的路径：${storageKey}`);
  }
  await fs.rm(absolutePath, { force: true });
}

async function removeStorageKeys(keys) {
  const values = Array.from(new Set(keys.filter(Boolean)));
  const ossKeys = values.filter(isOssStorageKey);
  const localKeys = values.filter((key) => !isOssStorageKey(key));
  if (ossKeys.length) await getOssClient().deleteMulti(ossKeys, { quiet: true });
  await Promise.all(localKeys.map(removeStorageKey));
}

async function getStorageLastModified(storageKey) {
  if (isOssStorageKey(storageKey)) {
    const result = await getOssClient().head(storageKey);
    const value = result.res.headers["last-modified"];
    const date = new Date(Array.isArray(value) ? value[0] : value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const details = await fs.stat(resolveStoragePath(storageKey));
  return details.mtime;
}

function resolveStoragePath(storageKey) {
  const absolutePath = path.resolve(storageRoot, storageKey);
  if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error(`拒绝访问存储根目录外的路径：${storageKey}`);
  }
  return absolutePath;
}

function isOfficeFile(fileName, fileType) {
  return /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(fileName ?? "")
    || /word|excel|spreadsheet|powerpoint|presentation|msword|officedocument/i.test(fileType ?? "");
}

function isOssStorageKey(storageKey) {
  return Boolean(process.env.OSS_BUCKET?.trim()) && storageKey.startsWith(`${getOssPrefix()}/`);
}

function getOssClient() {
  if (ossClient) return ossClient;
  const endpoint = requiredEnv("OSS_ENDPOINT");
  ossClient = new OSS({
    accessKeyId: requiredEnv("OSS_ACCESS_KEY_ID"),
    accessKeySecret: requiredEnv("OSS_ACCESS_KEY_SECRET"),
    bucket: requiredEnv("OSS_BUCKET"),
    region: requiredEnv("OSS_REGION"),
    endpoint: /^https?:\/\//i.test(endpoint) ? endpoint : `https://${endpoint}`,
    authorizationV4: true,
    secure: true,
    timeout: 120_000
  });
  return ossClient;
}

function getOssPrefix() {
  return process.env.OSS_PREFIX?.trim().replace(/^\/+|\/+$/g, "") || "resource-center";
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`未配置 ${name}`);
  return value;
}

async function readDirectoryOrEmpty(directory) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function resolveSafeStorageRoot(value) {
  if (!value?.trim()) throw new Error("未配置 FILE_STORAGE_ROOT");
  const resolved = path.resolve(value.trim());
  if (resolved === path.parse(resolved).root) throw new Error("拒绝使用文件系统根目录作为清理目标");
  return resolved;
}

function readPositiveNumber(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} 必须是正数`);
  return value;
}
