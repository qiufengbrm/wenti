/** 项目导读：接口路由 /api/tutorials：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { removeStoredKeys, storeUploadedFile } from "@/lib/resource-storage";
import { getTutorialAttachmentStorageKey } from "@/lib/tutorial-storage";
import { readTutorialForm } from "@/lib/tutorial-form";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.response) return auth.response;
  const tutorials = await prisma.tutorial.findMany({ include: { author: { select: { name: true } } }, orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }] });
  return NextResponse.json({ data: tutorials });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;

  const parsed = await readTutorialForm(request);
  if ("error" in parsed) return NextResponse.json({ message: parsed.error }, { status: parsed.status });

  const inlineImages = parsed.inlineImageIds.length ? await prisma.tutorialInlineImage.findMany({ where: { id: { in: parsed.inlineImageIds } } }) : [];
  if (inlineImages.length !== parsed.inlineImageIds.length || inlineImages.some((image) => image.tutorialId || image.uploadedById !== auth.user!.id)) {
    return NextResponse.json({ message: "正文中包含无效或无权使用的图片，请重新插入" }, { status: 400 });
  }

  const tutorial = await prisma.$transaction(async (tx) => {
    const created = await tx.tutorial.create({
      data: {
        title: parsed.title,
        content: parsed.content,
        contentFormat: "RICH_TEXT",
        category: parsed.category,
        visibility: parsed.visibility,
        status: parsed.statusValue,
        publishedAt: parsed.statusValue === "PUBLISHED" ? new Date() : null,
        tags: parsed.tags,
        isPinned: parsed.isPinned,
        authorId: auth.user!.id
      }
    });
    if (parsed.inlineImageIds.length) {
      await tx.tutorialInlineImage.updateMany({ where: { id: { in: parsed.inlineImageIds }, tutorialId: null, uploadedById: auth.user!.id }, data: { tutorialId: created.id } });
    }
    return created;
  });

  if (!parsed.attachment) {
    return NextResponse.json({ data: tutorial, message: parsed.statusValue === "PUBLISHED" ? "教程已发布" : "草稿已保存" }, { status: 201 });
  }

  let storageKey: string | null = null;
  try {
    storageKey = getTutorialAttachmentStorageKey(tutorial.id, parsed.attachmentName!);
    await storeUploadedFile(parsed.attachment, storageKey);
    const updated = await prisma.tutorial.update({
      where: { id: tutorial.id },
      data: {
        attachmentStorageKey: storageKey,
        attachmentFileName: parsed.attachmentName,
        attachmentFileType: parsed.attachment.type || "application/octet-stream",
        attachmentFileSize: parsed.attachment.size
      }
    });
    return NextResponse.json({ data: updated, message: parsed.statusValue === "PUBLISHED" ? "教程及附件已发布" : "草稿及附件已保存" }, { status: 201 });
  } catch (error) {
    const claimedImages = await prisma.tutorialInlineImage.findMany({ where: { tutorialId: tutorial.id }, select: { storageKey: true } }).catch(() => []);
    await prisma.tutorial.delete({ where: { id: tutorial.id } }).catch(() => undefined);
    await removeStoredKeys([storageKey, ...claimedImages.map((image) => image.storageKey)]);
    return NextResponse.json({ message: error instanceof Error ? error.message : "教程附件保存失败" }, { status: 500 });
  }
}
