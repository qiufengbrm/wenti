/** 项目导读：附件预览转换：按类型调用图片、Office 或视频工具；转换可以慢，原文件绝不能跟着渡劫。 */
import path from "node:path";
import {
  createImagePreview,
  createOfficePreview,
  createVideoPreview,
  getPreviewKind,
  getStoredFile,
  getStoredUpload,
  moveStoredFile,
  removeStoredKeys,
  storeUploadedFile,
  storedFileExists
} from "@/lib/resource-storage";

export type HourProofSource = "direct" | "task";

type ProofFile = {
  id: string;
  proofFileUrl: string | null;
  proofFileName: string | null;
  proofFileType: string | null;
};

const activeJobs = new Map<string, Promise<HourProofArtifacts>>();

export type HourProofArtifacts = {
  kind: ReturnType<typeof getPreviewKind>;
  previewKey: string;
  posterKey?: string;
};

export async function storeHourProofFile(file: File, source: HourProofSource, userId: string, recordId: string, fileName: string) {
  const directory = source === "direct" ? "hour-proofs" : "task-proofs";
  const originalKey = path.posix.join(directory, userId, recordId, fileName);
  const stored = await storeUploadedFile(file, originalKey);
  const kind = getPreviewKind(fileName, file.type);

  if (kind === "image") {
    try {
      // 图片证明只留压缩后的 JPG，既省空间，也免得手机原图大到能当壁纸印刷。
      const generated = await createImagePreview(stored);
      const imageKey = getHourProofArtifactKeys(source, recordId)[0];
      await moveStoredFile(generated.previewKey, imageKey);
      await removeStoredKeys([originalKey]);
      const compressed = await getStoredFile(imageKey);
      return {
        proofFileUrl: imageKey,
        proofFileName: `${path.parse(fileName).name}.jpg`,
        proofFileType: "image/jpeg",
        proofFileSize: compressed.size,
        previewFailed: false
      };
    } catch (error) {
      await removeStoredKeys([originalKey, ...getHourProofArtifactKeys(source, recordId)]);
      throw new Error(`图片压缩失败：${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  const proof = { id: recordId, proofFileUrl: originalKey, proofFileName: fileName, proofFileType: file.type || "application/octet-stream" };
  let previewFailed = false;
  if (kind !== "none" && kind !== "pdf") {
    try {
      await generateHourProofPreview(source, proof);
    } catch {
      previewFailed = true;
    }
  }
  return { ...proof, proofFileSize: file.size, previewFailed };
}

export function getHourProofArtifactKeys(source: HourProofSource, id: string) {
  const base = path.posix.join("proof-previews", source, id);
  return [
    path.posix.join(base, "preview.jpg"),
    path.posix.join(base, "preview.mp4"),
    path.posix.join(base, "preview.pdf"),
    path.posix.join(base, "poster.jpg")
  ];
}

export async function ensureHourProofPreview(source: HourProofSource, proof: ProofFile, options: { requirePoster?: boolean } = {}) {
  if (!proof.proofFileUrl || !proof.proofFileName) throw new Error("证明材料不存在");
  const kind = getPreviewKind(proof.proofFileName, proof.proofFileType);
  if (kind === "none") throw new Error("该格式不支持网页预览");
  if (kind === "pdf") {
    if (!(await storedFileExists(proof.proofFileUrl))) throw new Error("磁盘中的证明材料不存在");
    return { kind, previewKey: proof.proofFileUrl };
  }

  const [imageKey, videoKey, officeKey, posterKey] = getHourProofArtifactKeys(source, proof.id);
  const previewKey = kind === "image" ? imageKey : kind === "video" ? videoKey : officeKey;
  const ready = await storedFileExists(previewKey);
  const posterReady = kind !== "video" || !options.requirePoster || await storedFileExists(posterKey);
  if (ready && posterReady) return { kind, previewKey, posterKey: kind === "video" ? posterKey : undefined };

  const jobKey = `${source}:${proof.id}`;
  // 同一份证明同时被多人预览时共用一次转换任务，CPU 也需要落实八小时工作制。
  const existing = activeJobs.get(jobKey);
  if (existing) return existing;
  const job = generateHourProofPreview(source, proof);
  activeJobs.set(jobKey, job);
  try {
    return await job;
  } finally {
    activeJobs.delete(jobKey);
  }
}

export async function generateHourProofPreview(source: HourProofSource, proof: ProofFile): Promise<HourProofArtifacts> {
  if (!proof.proofFileUrl || !proof.proofFileName) throw new Error("证明材料不存在");
  const kind = getPreviewKind(proof.proofFileName, proof.proofFileType);
  if (kind === "none") throw new Error("该格式不支持网页预览");
  if (kind === "pdf") return { kind, previewKey: proof.proofFileUrl };

  const upload = await getStoredUpload(proof.proofFileUrl);
  const [imageKey, videoKey, officeKey, posterKey] = getHourProofArtifactKeys(source, proof.id);
  if (kind === "office") {
    const generated = await createOfficePreview(upload);
    await moveStoredFile(generated, officeKey);
    return { kind, previewKey: officeKey };
  }
  if (kind === "image") {
    const generated = await createImagePreview(upload);
    await moveStoredFile(generated.previewKey, imageKey);
    return { kind, previewKey: imageKey };
  }
  const generated = await createVideoPreview(upload);
  await moveStoredFile(generated.previewKey, videoKey);
  if (generated.posterKey) await moveStoredFile(generated.posterKey, posterKey);
  return { kind, previewKey: videoKey, posterKey };
}
