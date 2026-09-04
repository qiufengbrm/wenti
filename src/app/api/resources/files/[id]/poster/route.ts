/** 项目导读：接口路由 /api/resources/files/[id]/poster：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { getAccessibleFile } from "@/lib/resource-drive";
import { getResourceFile } from "@/lib/resource-file-storage";
import { ensurePreviewArtifacts } from "@/lib/resource-preview";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const { id } = await params;
  const file = await getAccessibleFile(auth.user, id);
  if (!file) return NextResponse.json({ message: "视频封面不存在或无权访问" }, { status: 404 });

  try {
    const { kind, posterKey } = await ensurePreviewArtifacts(file, { requirePoster: true });
    if (kind !== "video" || !posterKey) return NextResponse.json({ message: "该文件没有视频封面" }, { status: 415 });
    const stored = await getResourceFile(posterKey);
    return new Response(stored.stream as never, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(stored.size),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "视频封面重新生成失败";
    const status = message.includes("不支持") ? 415 : message.includes("原文件不存在") ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}
