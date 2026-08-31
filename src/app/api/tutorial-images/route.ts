/** 项目导读：教程正文图片上传口：只收图片、先压缩、再给编辑器一个能长期认账的地址。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin } from "@/app/api/_utils";
import { storeTutorialInlineImage } from "@/lib/tutorial-inline-images";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;

  let image: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("image");
    image = value instanceof File && value.size > 0 ? value : null;
  } catch {
    return NextResponse.json({ message: "无法读取图片" }, { status: 400 });
  }
  if (!image) return NextResponse.json({ message: "请选择要插入的图片" }, { status: 400 });

  try {
    const data = await storeTutorialInlineImage(image, auth.user.id);
    return NextResponse.json({ data, message: "图片已插入" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "图片处理失败" }, { status: 400 });
  }
}
