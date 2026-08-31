/** 项目导读：接口路由 /api/hour-proofs/[source]/[id]/poster：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { ensureHourProofPreview, type HourProofSource } from "@/lib/hour-proof-preview";
import { canAccessAdmin } from "@/lib/permissions";
import { getStoredFile } from "@/lib/resource-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ source: string; id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const { source, id } = await params;
  if (source !== "direct" && source !== "task") return NextResponse.json({ message: "证明材料类型无效" }, { status: 400 });
  const proof = await getProof(source, id);
  if (!proof || (!canAccessAdmin(auth.user.role) && proof.userId !== auth.user.id)) return NextResponse.json({ message: "证明材料不存在或无权访问" }, { status: 404 });

  try {
    const { kind, posterKey } = await ensureHourProofPreview(source, proof, { requirePoster: true });
    if (kind !== "video" || !posterKey) return NextResponse.json({ message: "该文件没有视频封面" }, { status: 415 });
    const stored = await getStoredFile(posterKey);
    return new Response(stored.stream as never, {
      headers: { "Content-Type": "image/jpeg", "Content-Length": String(stored.size), "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "视频封面生成失败";
    return NextResponse.json({ message }, { status: message.includes("不支持") ? 415 : message.includes("不存在") ? 404 : 500 });
  }
}

async function getProof(source: HourProofSource, id: string) {
  if (source === "direct") return prisma.volunteerHour.findUnique({ where: { id }, select: { id: true, userId: true, proofFileUrl: true, proofFileName: true, proofFileType: true } });
  return prisma.taskSubmission.findUnique({ where: { id }, select: { id: true, userId: true, proofFileUrl: true, proofFileName: true, proofFileType: true } });
}
