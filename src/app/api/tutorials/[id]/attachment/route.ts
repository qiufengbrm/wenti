/** 项目导读：接口路由 /api/tutorials/[id]/attachment：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { getStoredFile } from "@/lib/resource-storage";
import { tutorialContentDisposition } from "@/lib/tutorial-storage";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const { id } = await params;
  const tutorial = await prisma.tutorial.findUnique({ where: { id } });
  const volunteerAllowed = tutorial?.status === "PUBLISHED" && ["ALL", "VOLUNTEERS"].includes(tutorial.visibility);
  if (!tutorial || (auth.user.role === "volunteer" && !volunteerAllowed)) {
    return NextResponse.json({ message: "教程附件不存在或无权访问" }, { status: 404 });
  }
  if (!tutorial.attachmentStorageKey || !tutorial.attachmentFileName) {
    return NextResponse.json({ message: "该教程没有附件" }, { status: 404 });
  }

  try {
    const stored = await getStoredFile(tutorial.attachmentStorageKey);
    return new Response(stored.stream as never, {
      headers: {
        "Content-Type": tutorial.attachmentFileType || "application/octet-stream",
        "Content-Length": String(stored.size),
        "Content-Disposition": tutorialContentDisposition(tutorial.attachmentFileName),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ message: "磁盘中的教程附件不存在" }, { status: 404 });
  }
}
