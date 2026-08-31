/** 项目导读：附件预览转换：按类型调用图片、Office 或视频工具；转换可以慢，原文件绝不能跟着渡劫。 */
import type { FileResource } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createImagePreview,
  createOfficePreview,
  createVideoPreview,
  getPreviewKind,
  getStoredUpload,
  storedFileExists
} from "@/lib/resource-storage";

type PreviewArtifacts = {
  kind: ReturnType<typeof getPreviewKind>;
  previewKey: string;
  posterKey?: string | null;
};

const activeJobs = new Map<string, Promise<PreviewArtifacts>>();

export async function ensurePreviewArtifacts(file: FileResource, options: { requirePoster?: boolean } = {}): Promise<PreviewArtifacts> {
  if (!file.storageKey) throw new Error("原文件不存在");
  const kind = getPreviewKind(file.fileName ?? file.title, file.fileType);
  if (kind === "none") throw new Error("该格式不支持网页预览");

  if (kind === "pdf" || (kind === "image" && file.previewKey === file.storageKey)) {
    if (!(await storedFileExists(file.storageKey))) throw new Error("磁盘中的原文件不存在");
    return { kind, previewKey: file.storageKey, posterKey: file.posterKey };
  }

  const previewExists = await storedFileExists(file.previewKey);
  const posterExists = kind !== "video" || !options.requirePoster || await storedFileExists(file.posterKey);
  if (file.previewKey && previewExists && posterExists) {
    return { kind, previewKey: file.previewKey, posterKey: file.posterKey };
  }

  const existingJob = activeJobs.get(file.id);
  if (existingJob) return existingJob;

  const job = regeneratePreview(file, kind);
  activeJobs.set(file.id, job);
  try {
    return await job;
  } finally {
    activeJobs.delete(file.id);
  }
}

async function regeneratePreview(file: FileResource, kind: "image" | "video" | "office") {
  if (!file.storageKey) throw new Error("原文件不存在");
  const upload = await getStoredUpload(file.storageKey);
  await prisma.fileResource.update({ where: { id: file.id }, data: { previewStatus: "PENDING" } });

  try {
    const result = kind === "office"
      ? { previewKey: await createOfficePreview(upload), posterKey: null }
      : kind === "image"
        ? { ...(await createImagePreview(upload)), posterKey: null }
        : await createVideoPreview(upload);

    await prisma.fileResource.update({
      where: { id: file.id },
      data: { previewKey: result.previewKey, posterKey: result.posterKey ?? null, previewStatus: "READY" }
    });
    return { kind, previewKey: result.previewKey, posterKey: result.posterKey ?? null };
  } catch (error) {
    await prisma.fileResource.update({ where: { id: file.id }, data: { previewStatus: "FAILED" } }).catch(() => undefined);
    throw error;
  }
}
