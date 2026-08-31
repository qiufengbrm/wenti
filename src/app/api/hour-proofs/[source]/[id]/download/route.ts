/** 项目导读：接口路由 /api/hour-proofs/[source]/[id]/download：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";
import { getStoredFile } from "@/lib/resource-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ source: string; id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  const { source, id } = await params;
  if (source !== "direct" && source !== "task") return NextResponse.json({ message: "证明材料类型无效" }, { status: 400 });

  const proof = source === "direct"
    ? await prisma.volunteerHour.findUnique({ where: { id }, select: { userId: true, proofFileUrl: true, proofFileName: true, proofFileType: true } })
    : await prisma.taskSubmission.findUnique({ where: { id }, select: { userId: true, proofFileUrl: true, proofFileName: true, proofFileType: true } });

  if (!proof || (!canAccessAdmin(auth.user.role) && proof.userId !== auth.user.id)) {
    return NextResponse.json({ message: "证明材料不存在或无权访问" }, { status: 404 });
  }
  if (!proof.proofFileUrl || !proof.proofFileName) return NextResponse.json({ message: "未上传证明材料" }, { status: 404 });

  try {
    const stored = await getStoredFile(proof.proofFileUrl);
    return new Response(stored.stream as never, {
      headers: {
        "Content-Type": proof.proofFileType || "application/octet-stream",
        "Content-Length": String(stored.size),
        "Content-Disposition": contentDisposition(proof.proofFileName),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ message: "磁盘中的证明材料不存在" }, { status: 404 });
  }
}

function contentDisposition(name: string) {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
