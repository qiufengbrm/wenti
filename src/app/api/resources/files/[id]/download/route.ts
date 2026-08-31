/** 项目导读：接口路由 /api/resources/files/[id]/download：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { getAccessibleFile } from "@/lib/resource-drive";
import { getStoredFile } from "@/lib/resource-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const { id } = await params;
  const file = await getAccessibleFile(auth.user, id);
  if (!file) return NextResponse.json({ message: "文件不存在或无权访问" }, { status: 404 });

  if (!file.storageKey && file.fileUrl) return NextResponse.redirect(new URL(file.fileUrl, request.url));
  if (!file.storageKey) return NextResponse.json({ message: "原文件不存在" }, { status: 404 });

  try {
    const stored = await getStoredFile(file.storageKey);
    return new Response(stored.stream as never, {
      headers: {
        "Content-Type": file.fileType || "application/octet-stream",
        "Content-Length": String(stored.size),
        "Content-Disposition": contentDisposition("attachment", file.fileName ?? file.title),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ message: "磁盘中的原文件不存在" }, { status: 404 });
  }
}

function contentDisposition(mode: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
