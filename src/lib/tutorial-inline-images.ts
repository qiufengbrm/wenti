/** 项目导读：教程正文图片仓库：先压成 1080p JPG 再落盘，大图也得先减轻行李再进正文。 */
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/db";
import { createImagePreview, getPreviewKind, getStoredFile, moveStoredFile, removeStoredKeys, storeUploadedFile } from "@/lib/resource-storage";

export const MAX_TUTORIAL_INLINE_IMAGE_SIZE = 20 * 1024 * 1024;

export async function storeTutorialInlineImage(file: File, uploadedById: string) {
  if (file.size > MAX_TUTORIAL_INLINE_IMAGE_SIZE) throw new Error("正文图片不能超过 20MB");
  if (getPreviewKind(file.name, file.type) !== "image") throw new Error("正文只能插入 JPG、PNG、GIF、WebP、BMP 或 TIFF 图片");

  const id = randomUUID();
  const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".image";
  const temporaryKey = path.posix.join("temp", "tutorial-inline-images", `${id}${extension}`);
  const storageKey = path.posix.join("originals", "tutorial-images", `${id}.jpg`);

  await prisma.tutorialInlineImage.create({
    data: { id, tutorialId: null, storageKey, uploadedById, fileName: `${path.parse(file.name).name}.jpg`, fileSize: 0 }
  });

  try {
    const stored = await storeUploadedFile(file, temporaryKey);
    const generated = await createImagePreview(stored);
    await moveStoredFile(generated.previewKey, storageKey);
    await removeStoredKeys([temporaryKey]);
    const compressed = await getStoredFile(storageKey);
    const image = await prisma.tutorialInlineImage.update({ where: { id }, data: { fileSize: compressed.size } });
    return { id: image.id, fileName: image.fileName, fileSize: image.fileSize, url: `/api/tutorial-images/${image.id}` };
  } catch (error) {
    await prisma.tutorialInlineImage.delete({ where: { id } }).catch(() => undefined);
    await removeStoredKeys([temporaryKey, storageKey]);
    throw error;
  }
}
