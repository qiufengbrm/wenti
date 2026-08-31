/** 项目导读：维护脚本 cleanup-storage：先确认路径和 dry-run 结果再动手，硬盘里的文件不是野菜，不能随便薅。 */
import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import prismaPackage from "@prisma/client";

const { loadEnvConfig } = nextEnv;
const { PrismaClient } = prismaPackage;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const dryRun = process.argv.includes("--dry-run");
const storageRoot = resolveSafeStorageRoot(process.env.FILE_STORAGE_ROOT);
const tempRetentionHours = readPositiveNumber("TEMP_FILE_RETENTION_HOURS", 24);
const orphanPreviewRetentionDays = readPositiveNumber("ORPHAN_PREVIEW_RETENTION_DAYS", 7);
const tutorialImageRetentionHours = readPositiveNumber("TUTORIAL_INLINE_IMAGE_RETENTION_HOURS", 24);
const now = Date.now();
const prisma = new PrismaClient();

try {
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
      tutorialInlineImageHours: tutorialImageRetentionHours
    },
    temp: tempResult,
    orphanPreviews: previewResult,
    abandonedTutorialImages: tutorialImageResult
  }, null, 2));
} finally {
  await prisma.$disconnect();
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
