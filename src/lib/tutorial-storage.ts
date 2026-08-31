/** 项目导读：教程业务工具：统一整理表单和附件存储；草稿与发布各走各路，免得半成品抢先登台。 */
import { randomUUID } from "node:crypto";
import path from "node:path";

export function getTutorialAttachmentStorageKey(tutorialId: string, fileName: string) {
  return path.posix.join("originals", "tutorials", tutorialId, `${randomUUID()}-${fileName}`);
}

export function tutorialContentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
