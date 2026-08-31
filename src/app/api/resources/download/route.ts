/** 项目导读：资料批量下载接口：接收用户勾选项并流式返回 ZIP；选择可以豪迈，权限检查不能潦草。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { archiveContentDisposition, createResourceArchive, ResourceArchiveError, type ResourceArchiveSelection } from "@/lib/resource-archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  let selections: ResourceArchiveSelection[] = [];
  try {
    const form = await request.formData();
    const raw = form.get("selections");
    const parsed = typeof raw === "string" ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) selections = parsed;
  } catch {
    return NextResponse.json({ message: "批量下载内容格式无效" }, { status: 400 });
  }

  try {
    const result = await createResourceArchive(auth.user, selections, `资料批量下载-${dateStamp()}`);
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
    return NextResponse.json({ message: "资料打包失败，请稍后重试" }, { status: 500 });
  }
}

function dateStamp() {
  const formatter = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  return formatter.format(new Date()).replace(/\//g, "-");
}
