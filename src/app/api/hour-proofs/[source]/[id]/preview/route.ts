/** 项目导读：接口路由 /api/hour-proofs/[source]/[id]/preview：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { ensureHourProofPreview, type HourProofSource } from "@/lib/hour-proof-preview";
import { canAccessAdmin } from "@/lib/permissions";
import { getHourProofFile } from "@/lib/hour-proof-storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ source: string; id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const { source, id } = await params;
  if (source !== "direct" && source !== "task") return NextResponse.json({ message: "证明材料类型无效" }, { status: 400 });
  const proof = await getProof(source, id);
  if (!proof || (!canAccessAdmin(auth.user.role) && proof.userId !== auth.user.id)) return NextResponse.json({ message: "证明材料不存在或无权访问" }, { status: 404 });

  try {
    const { kind, previewKey } = await ensureHourProofPreview(source, proof);
    const metadata = await getHourProofFile(previewKey);
    const range = kind === "video" ? parseRange(request.headers.get("range"), metadata.size) : null;
    if (range === "invalid") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}` } });
    const stored = range ? await getHourProofFile(previewKey, range) : metadata;
    const contentType = kind === "image" ? "image/jpeg" : kind === "video" ? "video/mp4" : "application/pdf";
    return new Response(stored.stream as never, {
      status: range ? 206 : 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(range ? range.end - range.start + 1 : stored.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(proof.proofFileName ?? "proof")}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        ...(kind === "video" ? { "Accept-Ranges": "bytes" } : {}),
        ...(range ? { "Content-Range": `bytes ${range.start}-${range.end}/${metadata.size}` } : {}),
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:;"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "预览生成失败";
    return NextResponse.json({ message }, { status: message.includes("不支持") ? 415 : message.includes("不存在") ? 404 : 500 });
  }
}

async function getProof(source: HourProofSource, id: string) {
  if (source === "direct") {
    return prisma.volunteerHour.findUnique({
      where: { id },
      select: { id: true, userId: true, proofFileUrl: true, proofFileName: true, proofFileType: true }
    });
  }
  return prisma.taskSubmission.findUnique({
    where: { id },
    select: { id: true, userId: true, proofFileUrl: true, proofFileName: true, proofFileType: true }
  });
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
