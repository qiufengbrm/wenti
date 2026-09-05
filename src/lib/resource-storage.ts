/** 项目导读：资料文件落盘逻辑：同时照顾数据库记录与磁盘路径；两边必须对得上账，不能一个说东一个说西。 */
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

export const MAX_RESOURCE_FILE_SIZE = 500 * 1024 * 1024;
export const MAX_TUTORIAL_ATTACHMENT_SIZE = 100 * 1024 * 1024;
export const PREVIEW_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"]);
export const PREVIEW_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/x-msvideo"]);
export const OFFICE_EXTENSIONS = new Set([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]);

export interface StoredUpload {
  storageKey: string;
  absolutePath: string;
  extension: string;
}

export function getStorageRoot() {
  const configured = process.env.FILE_STORAGE_ROOT?.trim();
  if (!configured) throw new Error("未配置 FILE_STORAGE_ROOT，无法使用资料库存储");
  return path.resolve(configured);
}

export async function ensureStorageReady() {
  const root = getStorageRoot();
  await Promise.all(["originals", "previews", "temp"].map((directory) => mkdir(path.join(root, directory), { recursive: true })));
  await access(root, constants.R_OK | constants.W_OK);
  return root;
}

export function resolveStorageKey(storageKey: string) {
  const root = getStorageRoot();
  const resolved = path.resolve(root, storageKey);
  // 路径必须老实待在仓库根目录里，想用 ../ 翻墙的一律门口劝返。
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error("非法存储路径");
  return resolved;
}

export function getOriginalDirectoryKey(projectName: string, folderNames: string[] = []) {
  return path.posix.join("originals", assertStorageSegment(projectName), ...folderNames.map(assertStorageSegment));
}

export function getOriginalFileKey(projectName: string, folderNames: string[], fileName: string) {
  return path.posix.join(getOriginalDirectoryKey(projectName, folderNames), assertStorageSegment(fileName));
}

export async function ensureStoredDirectory(storageKey: string) {
  await ensureStorageReady();
  await mkdir(resolveStorageKey(storageKey), { recursive: true });
}

export async function storeUploadedFile(file: File, storageKey: string): Promise<StoredUpload> {
  await ensureStorageReady();
  const extension = safeExtension(file.name);
  const absolutePath = resolveStorageKey(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const source = Readable.fromWeb(file.stream() as never);
  // wx 会拒绝覆盖同名文件：宁可明确报错，也不拿旧资料给新文件腾座位。
  await pipeline(source, createWriteStream(absolutePath, { flags: "wx" }));
  return { storageKey, absolutePath, extension };
}

export async function moveStoredFile(sourceKey: string, destinationKey: string) {
  if (sourceKey === destinationKey) return;
  const sourcePath = resolveStorageKey(sourceKey);
  const destinationPath = resolveStorageKey(destinationKey);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  try {
    await access(destinationPath, constants.F_OK);
    throw new Error("磁盘中的目标位置已存在同名文件");
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
  }
  await rename(sourcePath, destinationPath);
}

export async function removeStoredDirectory(storageKey: string) {
  await rm(resolveStorageKey(storageKey), { recursive: true, force: true });
}

export async function createOfficePreview(upload: StoredUpload) {
  const root = await ensureStorageReady();
  const previewName = `${randomUUID()}.pdf`;
  const previewKey = path.posix.join("previews", previewName);
  const previewPath = resolveStorageKey(previewKey);
  const jobPath = path.join(root, "temp", randomUUID());
  const outputDir = path.join(jobPath, "output");
  const generatedPath = path.join(outputDir, `${path.basename(upload.absolutePath, path.extname(upload.absolutePath))}.pdf`);
  // 每次转换独享 LibreOffice 配置目录，免得并发任务互相串门、顺手锁个文件。
  const profilePath = path.join(jobPath, "profile");
  await mkdir(outputDir, { recursive: true });
  await mkdir(profilePath, { recursive: true });

  try {
    const fontConfigPath = await createFontConfig(profilePath);
    await execFileAsync(
      process.env.SOFFICE_PATH?.trim() || "soffice",
      [
        "--headless",
        `-env:UserInstallation=${pathToFileURL(profilePath).href}`,
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        upload.absolutePath
      ],
      {
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, FONTCONFIG_FILE: fontConfigPath }
      }
    );
    const outputPath = await findOfficePreviewOutput(outputDir, generatedPath);
    await rename(outputPath, previewPath);
    await access(previewPath, constants.R_OK);
    return previewKey;
  } finally {
    await rm(jobPath, { recursive: true, force: true });
  }
}

async function findOfficePreviewOutput(outputDir: string, generatedPath: string) {
  try {
    await access(generatedPath, constants.R_OK);
    return generatedPath;
  } catch {}

  const entries = await readdir(outputDir, { withFileTypes: true });
  const pdfs = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"));
  if (pdfs.length === 1) return path.join(outputDir, pdfs[0].name);
  throw new Error(`Office 预览 PDF 未生成，输出目录包含 ${pdfs.length} 个 PDF`);
}

export interface MediaPreview {
  previewKey: string;
  posterKey?: string;
}

export async function createImagePreview(upload: StoredUpload): Promise<MediaPreview> {
  await ensureStorageReady();
  const previewKey = path.posix.join("previews", `${randomUUID()}.jpg`);
  const previewPath = resolveStorageKey(previewKey);

  try {
    await runFfmpeg([
      "-y",
      "-i", upload.absolutePath,
      "-frames:v", "1",
      "-vf", "scale=w=trunc(min(iw\\,1920)/2)*2:h=trunc(min(ih\\,1080)/2)*2:force_original_aspect_ratio=decrease",
      "-c:v", "mjpeg",
      "-q:v", "3",
      "-map_metadata", "-1",
      previewPath
    ], 120_000);
    await access(previewPath, constants.R_OK);
    return { previewKey };
  } catch (error) {
    await rm(previewPath, { force: true });
    throw error;
  }
}

export async function createVideoPreview(upload: StoredUpload): Promise<MediaPreview> {
  await ensureStorageReady();
  const previewId = randomUUID();
  const previewKey = path.posix.join("previews", `${previewId}.mp4`);
  const posterKey = path.posix.join("previews", `${previewId}-poster.jpg`);
  const previewPath = resolveStorageKey(previewKey);
  const posterPath = resolveStorageKey(posterKey);

  try {
    await runFfmpeg([
      "-y",
      "-i", upload.absolutePath,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-vf", "scale=w=trunc(min(iw\\,1920)/2)*2:h=-2",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-map_metadata", "-1",
      previewPath
    ], 30 * 60_000);
    await runFfmpeg([
      "-y",
      "-i", previewPath,
      "-frames:v", "1",
      "-vf", "scale=w=trunc(min(iw\\,1280)/2)*2:h=-2",
      "-c:v", "mjpeg",
      "-q:v", "3",
      posterPath
    ], 120_000);
    await Promise.all([access(previewPath, constants.R_OK), access(posterPath, constants.R_OK)]);
    return { previewKey, posterKey };
  } catch (error) {
    await Promise.all([rm(previewPath, { force: true }), rm(posterPath, { force: true })]);
    throw error;
  }
}

async function runFfmpeg(args: string[], timeout: number) {
  const executable = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
  try {
    await execFileAsync(executable, args, { timeout, maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "未知错误";
    throw new Error(`FFmpeg 转换失败：${detail}`);
  }
}

async function createFontConfig(profilePath: string) {
  const cachePath = path.join(profilePath, "font-cache");
  const configPath = path.join(profilePath, "fonts.conf");
  await mkdir(cachePath, { recursive: true });
  const xml = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>/System/Library/Fonts</dir>
  <dir>/System/Library/Fonts/Supplemental</dir>
  <dir>/Library/Fonts</dir>
  <dir>/usr/share/fonts</dir>
  <dir>/usr/local/share/fonts</dir>
  <cachedir>${escapeXml(cachePath)}</cachedir>
  <alias><family>sans-serif</family><prefer><family>Hiragino Sans GB</family><family>STHeiti</family></prefer></alias>
  <alias><family>serif</family><prefer><family>Songti SC</family><family>Hiragino Sans GB</family></prefer></alias>
  <alias><family>SimSun</family><prefer><family>Songti SC</family></prefer></alias>
  <alias><family>宋体</family><prefer><family>Songti SC</family></prefer></alias>
  <alias><family>Microsoft YaHei</family><prefer><family>Hiragino Sans GB</family></prefer></alias>
  <alias><family>微软雅黑</family><prefer><family>Hiragino Sans GB</family></prefer></alias>
</fontconfig>`;
  await writeFile(configPath, xml, "utf8");
  return configPath;
}

export function getPreviewKind(fileName: string, mimeType?: string | null) {
  const extension = safeExtension(fileName);
  if (mimeType === "application/pdf" || extension === ".pdf") return "pdf" as const;
  if ((mimeType && PREVIEW_IMAGE_TYPES.has(mimeType)) || [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff"].includes(extension)) return "image" as const;
  if ((mimeType && PREVIEW_VIDEO_TYPES.has(mimeType)) || [".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"].includes(extension)) return "video" as const;
  if (OFFICE_EXTENSIONS.has(extension)) return "office" as const;
  return "none" as const;
}

export async function getStoredFile(storageKey: string, range?: { start: number; end: number }) {
  const absolutePath = resolveStorageKey(storageKey);
  const details = await stat(absolutePath);
  if (!details.isFile()) throw new Error("资料文件不存在");
  return { absolutePath, size: details.size, stream: createReadStream(absolutePath, range) };
}

export async function storedFileExists(storageKey?: string | null) {
  if (!storageKey) return false;
  try {
    const details = await stat(resolveStorageKey(storageKey));
    return details.isFile();
  } catch {
    return false;
  }
}

export async function getStoredUpload(storageKey: string): Promise<StoredUpload> {
  const absolutePath = resolveStorageKey(storageKey);
  const details = await stat(absolutePath);
  if (!details.isFile()) throw new Error("磁盘中的原文件不存在");
  return { storageKey, absolutePath, extension: safeExtension(absolutePath) };
}

export async function removeStoredKeys(keys: Array<string | null | undefined>) {
  await Promise.all(
    Array.from(new Set(keys.filter((key): key is string => Boolean(key)))).map(async (key) => {
      try {
        await rm(resolveStorageKey(key), { force: true });
      } catch {
        // Database deletion remains authoritative; an orphan can be cleaned later.
      }
    })
  );
}

function safeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : "";
}

function assertStorageSegment(value: string) {
  if (!value || value === "." || value === ".." || /[\\/\u0000-\u001f]/.test(value)) throw new Error("资料名称不能用于磁盘路径");
  return value;
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
