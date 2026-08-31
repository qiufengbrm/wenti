/** 项目导读：接口路由 /api/tutorials/[id]：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { removeStoredKeys, storeUploadedFile } from "@/lib/resource-storage";
import { getTutorialAttachmentStorageKey } from "@/lib/tutorial-storage";
import { readTutorialForm } from "@/lib/tutorial-form";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const existing = await prisma.tutorial.findUnique({ where: { id }, include: { inlineImages: true } });
  if (!existing) return NextResponse.json({ message: "教程不存在" }, { status: 404 });

  const parsed = await readTutorialForm(request);
  if ("error" in parsed) return NextResponse.json({ message: parsed.error }, { status: parsed.status });
  const requestedImages = parsed.inlineImageIds.length ? await prisma.tutorialInlineImage.findMany({ where: { id: { in: parsed.inlineImageIds } } }) : [];
  if (requestedImages.length !== parsed.inlineImageIds.length || requestedImages.some((image) => image.tutorialId !== id && (image.tutorialId || image.uploadedById !== auth.user!.id))) {
    return NextResponse.json({ message: "正文中包含无效或无权使用的图片，请重新插入" }, { status: 400 });
  }
  const removedInlineImages = existing.inlineImages.filter((image) => !parsed.inlineImageIds.includes(image.id));
  let newStorageKey: string | null = null;

  try {
    if (parsed.attachment) {
      newStorageKey = getTutorialAttachmentStorageKey(id, parsed.attachmentName!);
      await storeUploadedFile(parsed.attachment, newStorageKey);
    }
    const tutorial = await prisma.$transaction(async (tx) => {
      const updated = await tx.tutorial.update({
        where: { id },
        data: {
          title: parsed.title,
          content: parsed.content,
          contentFormat: "RICH_TEXT",
          category: parsed.category,
          visibility: parsed.visibility,
          status: parsed.statusValue,
          publishedAt: parsed.statusValue === "PUBLISHED" ? existing.publishedAt ?? new Date() : null,
          tags: parsed.tags,
          isPinned: parsed.isPinned,
          ...((parsed.attachment || parsed.removeAttachment) ? {
            attachmentStorageKey: newStorageKey,
            attachmentFileName: parsed.attachmentName,
            attachmentFileType: parsed.attachment?.type || null,
            attachmentFileSize: parsed.attachment?.size || null
          } : {})
        }
      });
      if (parsed.inlineImageIds.length) {
        await tx.tutorialInlineImage.updateMany({ where: { id: { in: parsed.inlineImageIds }, tutorialId: null, uploadedById: auth.user!.id }, data: { tutorialId: id } });
      }
      await tx.tutorialInlineImage.deleteMany({ where: { tutorialId: id, ...(parsed.inlineImageIds.length ? { id: { notIn: parsed.inlineImageIds } } : {}) } });
      return updated;
    });
    if ((parsed.attachment || parsed.removeAttachment) && existing.attachmentStorageKey !== newStorageKey) {
      await removeStoredKeys([existing.attachmentStorageKey]);
    }
    await removeStoredKeys(removedInlineImages.map((image) => image.storageKey));
    return NextResponse.json({ data: tutorial, message: parsed.statusValue === "PUBLISHED" ? "教程已发布" : "草稿已保存" });
  } catch (error) {
    await removeStoredKeys([newStorageKey]);
    return NextResponse.json({ message: error instanceof Error ? error.message : "教程保存失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const tutorial = await prisma.tutorial.findUnique({ where: { id }, select: { attachmentStorageKey: true, inlineImages: { select: { storageKey: true } } } });
  if (!tutorial) return NextResponse.json({ message: "教程不存在" }, { status: 404 });
  await prisma.tutorial.delete({ where: { id } });
  await removeStoredKeys([tutorial.attachmentStorageKey, ...tutorial.inlineImages.map((image) => image.storageKey)]);
  return NextResponse.json({ message: "教程及附件已永久删除" });
}
