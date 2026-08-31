/** 项目导读：接口路由 /api/resources/upload：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { canAccessFolder, ensureNameAvailable, validateResourceName } from "@/lib/resource-drive";
import { getResourceOriginalFileKey } from "@/lib/resource-file-tree";
import { createImagePreview, createOfficePreview, createVideoPreview, getPreviewKind, MAX_RESOURCE_FILE_SIZE, removeStoredKeys, storeUploadedFile } from "@/lib/resource-storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "无法读取上传内容" }, { status: 400 });
  }

  const value = form.get("file");
  if (!(value instanceof File)) return NextResponse.json({ message: "请选择要上传的文件" }, { status: 400 });
  if (value.size <= 0) return NextResponse.json({ message: "不能上传空文件" }, { status: 400 });
  if (value.size > MAX_RESOURCE_FILE_SIZE) return NextResponse.json({ message: "单个文件不能超过 500MB" }, { status: 413 });

  const sourcePreviewKind = getPreviewKind(value.name, value.type);
  const name = validateResourceName(value.name);
  if (!name) return NextResponse.json({ message: "文件名无效" }, { status: 400 });
  const projectIdValue = form.get("projectId");
  const projectId = typeof projectIdValue === "string" ? projectIdValue.trim() : "";
  if (!projectId || !(await prisma.resourceProject.findUnique({ where: { id: projectId }, select: { id: true } }))) {
    return NextResponse.json({ message: "请选择有效的活动项目" }, { status: 400 });
  }
  const folderIdValue = form.get("folderId");
  const folderId = typeof folderIdValue === "string" && folderIdValue ? folderIdValue : null;
  const folder = folderId ? await prisma.resourceFolder.findUnique({ where: { id: folderId } }) : null;
  if (folderId && (!folder || folder.projectId !== projectId)) return NextResponse.json({ message: "目标目录不存在" }, { status: 404 });
  if (folderId && !(await canAccessFolder(auth.user, folderId))) return NextResponse.json({ message: "无权上传到此目录" }, { status: 403 });
  if (!(await ensureNameAvailable(projectId, folderId, name))) return NextResponse.json({ message: "当前目录已存在同名项目" }, { status: 409 });

  let stored: Awaited<ReturnType<typeof storeUploadedFile>> | null = null;
  let storedSize = value.size;
  try {
    const storageKey = await getResourceOriginalFileKey(projectId, folderId, name);
    stored = await storeUploadedFile(value, storageKey);
  } catch (error) {
    if (stored) await removeStoredKeys([stored.storageKey]);
    return NextResponse.json({ message: error instanceof Error ? error.message : "文件保存失败" }, { status: 500 });
  }
  if (!stored) return NextResponse.json({ message: "文件保存失败" }, { status: 500 });

  const previewKind = sourcePreviewKind;
  const requiresConversion = previewKind === "office" || previewKind === "image" || previewKind === "video";
  const initialStatus = previewKind === "pdf" ? "READY" : requiresConversion ? "PENDING" : "NONE";
  let file;
  try {
    file = await prisma.fileResource.create({
      data: {
        title: name,
        category: "资料",
        fileName: name,
        fileType: value.type || "application/octet-stream",
        fileSize: storedSize,
        fileUrl: null,
        folderId,
        projectId,
        storageKey: stored.storageKey,
        previewKey: initialStatus === "READY" ? stored.storageKey : null,
        previewStatus: initialStatus,
        visibility: folder?.visibility ?? "ALL",
        uploadedById: auth.user.id
      }
    });
  } catch (error) {
    await removeStoredKeys([stored.storageKey]);
    return NextResponse.json({ message: error instanceof Error ? error.message : "资料记录保存失败" }, { status: 500 });
  }

  if (requiresConversion) {
    try {
      const result = previewKind === "office"
        ? { previewKey: await createOfficePreview(stored) }
        : previewKind === "image"
          ? await createImagePreview(stored)
          : await createVideoPreview(stored);
      file = await prisma.fileResource.update({
        where: { id: file.id },
        data: { previewKey: result.previewKey, posterKey: result.posterKey ?? null, previewStatus: "READY" }
      });
    } catch {
      file = await prisma.fileResource.update({ where: { id: file.id }, data: { previewStatus: "FAILED" } });
    }
  }

  return NextResponse.json({ data: file, message: file.previewStatus === "FAILED" ? "上传成功，但预览生成失败" : "上传成功" }, { status: 201 });
}
