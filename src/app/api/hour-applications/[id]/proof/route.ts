/** 项目导读：接口路由 /api/hour-applications/[id]/proof：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";
import { getHourProofFile } from "@/lib/hour-proof-storage";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const { id } = await params;
  const application = await prisma.volunteerHour.findUnique({ where: { id } });
  if (!application || (!canAccessAdmin(auth.user.role) && application.userId !== auth.user.id)) return NextResponse.json({ message: "证明材料不存在或无权访问" }, { status: 404 });
  if (!application.proofFileUrl || !application.proofFileName) return NextResponse.json({ message: "未上传证明材料" }, { status: 404 });
  try {
    const stored = await getHourProofFile(application.proofFileUrl);
    return new Response(stored.stream as never, {
      headers: {
        "Content-Type": application.proofFileType || "application/octet-stream",
        "Content-Length": String(stored.size),
        "Content-Disposition": contentDisposition(application.proofFileName),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ message: "存储中的证明材料不存在" }, { status: 404 });
  }
}

function contentDisposition(name: string) {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
