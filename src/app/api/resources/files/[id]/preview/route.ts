/** 项目导读：接口路由 /api/resources/files/[id]/preview：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { getAccessibleFile } from "@/lib/resource-drive";
import { ensurePreviewArtifacts } from "@/lib/resource-preview";
import { getStoredFile } from "@/lib/resource-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const { id } = await params;
  const file = await getAccessibleFile(auth.user, id);
  if (!file) return NextResponse.json({ message: "文件不存在或无权访问" }, { status: 404 });
  if (!file.storageKey) return NextResponse.json({ message: "链接型旧资料不支持站内预览" }, { status: 415 });

  try {
    const { kind, previewKey } = await ensurePreviewArtifacts(file);
    const metadata = await getStoredFile(previewKey);
    const range = kind === "video" ? parseRange(request.headers.get("range"), metadata.size) : null;
    if (range === "invalid") {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}` } });
    }
    const stored = range ? await getStoredFile(previewKey, range) : metadata;
    const contentType = kind === "image" ? "image/jpeg" : kind === "video" ? "video/mp4" : "application/pdf";
    const contentLength = range ? range.end - range.start + 1 : stored.size;
    return new Response(stored.stream as never, {
      status: range ? 206 : 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(contentLength),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName ?? file.title)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        ...(kind === "video" ? { "Accept-Ranges": "bytes" } : {}),
        ...(range ? { "Content-Range": `bytes ${range.start}-${range.end}/${stored.size}` } : {}),
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:;"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "预览重新生成失败";
    const status = message.includes("不支持") ? 415 : message.includes("原文件不存在") ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}

function parseRange(value: string | null, size: number): { start: number; end: number } | null | "invalid" {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return "invalid";
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[2] && match[1] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return "invalid";
  end = Math.min(end, size - 1);
  return { start, end };
}
