/** 项目导读：教程正文图片读取口：图片虽在正文里露脸，权限还是跟着教程走，不能翻墙串门。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { getStoredFile } from "@/lib/resource-storage";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const { id } = await params;
  const image = await prisma.tutorialInlineImage.findUnique({
    where: { id },
    include: { tutorial: { select: { status: true, visibility: true } } }
  });
  if (!image) return NextResponse.json({ message: "正文图片不存在" }, { status: 404 });

  const volunteerAllowed = image.tutorial?.status === "PUBLISHED" && ["ALL", "VOLUNTEERS"].includes(image.tutorial.visibility);
  const pendingAllowed = !image.tutorialId && (auth.user.id === image.uploadedById || auth.user.role === "super_admin");
  const allowed = auth.user.role !== "volunteer" ? Boolean(image.tutorialId) || pendingAllowed : volunteerAllowed;
  if (!allowed) return NextResponse.json({ message: "正文图片不存在或无权访问" }, { status: 404 });

  try {
    const stored = await getStoredFile(image.storageKey);
    return new Response(stored.stream as never, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(stored.size),
        "Content-Disposition": `inline; filename="${image.id}.jpg"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ message: "磁盘中的正文图片不存在" }, { status: 404 });
  }
}
