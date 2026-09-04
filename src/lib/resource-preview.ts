/** 项目导读：附件预览转换：按类型调用图片、Office 或视频工具；转换可以慢，原文件绝不能跟着渡劫。 */
import type { FileResource } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getResourceUploadForPreview, removeResourceStorageKeys, resourceFileExists } from "@/lib/resource-file-storage";
import { createResourceObjectKey, isResourceObjectKey, putResourceObjectFromPath } from "@/lib/resource-object-storage";
import {
  createImagePreview,
  createOfficePreview,
  createVideoPreview,
  getPreviewKind,
  removeStoredKeys,
  resolveStorageKey
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
    if (!(await resourceFileExists(file.storageKey))) throw new Error("原文件不存在");
    return { kind, previewKey: file.storageKey, posterKey: file.posterKey };
  }

  const previewExists = await resourceFileExists(file.previewKey);
  const posterExists = kind !== "video" || !options.requirePoster || await resourceFileExists(file.posterKey);
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
  const sourceIsOss = isResourceObjectKey(file.storageKey);
  const staged = await getResourceUploadForPreview(file.storageKey, file.fileName ?? file.title);

  const localArtifactKeys: string[] = [];
  const uploadedArtifactKeys: string[] = [];
  try {
    await prisma.fileResource.update({ where: { id: file.id }, data: { previewStatus: "PENDING" } });
    const localResult: { previewKey: string; posterKey?: string | null } = kind === "office"
      ? { previewKey: await createOfficePreview(staged.upload), posterKey: null }
      : kind === "image"
        ? { ...(await createImagePreview(staged.upload)), posterKey: null }
        : await createVideoPreview(staged.upload);
    let result = localResult;
    if (sourceIsOss) {
      localArtifactKeys.push(localResult.previewKey, ...(localResult.posterKey ? [localResult.posterKey] : []));
      const previewName = kind === "video" ? "preview.mp4" : kind === "image" ? "preview.jpg" : "preview.pdf";
      const previewMime = kind === "video" ? "video/mp4" : kind === "image" ? "image/jpeg" : "application/pdf";
      const artifactId = `${file.id}-${randomUUID()}`;
      const previewKey = createResourceObjectKey("previews", artifactId, previewName);
      await putResourceObjectFromPath(previewKey, resolveStorageKey(localResult.previewKey), previewMime);
      uploadedArtifactKeys.push(previewKey);
      let posterKey: string | null = null;
      if (localResult.posterKey) {
        posterKey = createResourceObjectKey("previews", artifactId, "poster.jpg");
        await putResourceObjectFromPath(posterKey, resolveStorageKey(localResult.posterKey), "image/jpeg");
        uploadedArtifactKeys.push(posterKey);
      }
      result = { previewKey, posterKey };
    }

    await prisma.fileResource.update({
      where: { id: file.id },
      data: { previewKey: result.previewKey, posterKey: result.posterKey ?? null, previewStatus: "READY" }
    });
    await removeResourceStorageKeys(
      [file.previewKey, file.posterKey].filter((key) => key && key !== file.storageKey && !uploadedArtifactKeys.includes(key))
    );
    return { kind, previewKey: result.previewKey, posterKey: result.posterKey ?? null };
  } catch (error) {
    await removeResourceStorageKeys(uploadedArtifactKeys);
    await prisma.fileResource.update({ where: { id: file.id }, data: { previewStatus: "FAILED" } }).catch(() => undefined);
    throw error;
  } finally {
    await removeStoredKeys([...staged.cleanupKeys, ...localArtifactKeys]);
  }
}
