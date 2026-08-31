/** 项目导读：文件夹下载接口：校验访问权限后流式打包整个目录，文件再多也不先塞满服务器内存。 */
import { NextResponse } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { archiveContentDisposition, createResourceArchive, ResourceArchiveError } from "@/lib/resource-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  const { id } = await params;
  const folder = await prisma.resourceFolder.findUnique({ where: { id }, select: { name: true } });
  if (!folder) return NextResponse.json({ message: "文件夹不存在或无权访问" }, { status: 404 });

  try {
    const result = await createResourceArchive(auth.user, [{ kind: "folder", id }], folder.name);
    return new Response(result.stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": archiveContentDisposition(result.fileName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error instanceof ResourceArchiveError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: "文件夹打包失败，请稍后重试" }, { status: 500 });
  }
}
