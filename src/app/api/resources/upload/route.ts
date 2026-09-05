/** 项目导读：接口路由 /api/resources/upload：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { canAccessFolder, ensureNameAvailable, validateResourceName } from "@/lib/resource-drive";
import { removeResourceStorageKeys } from "@/lib/resource-file-storage";
import { getResourceOriginalFileKey } from "@/lib/resource-file-tree";
import { createResourceObjectKey, isResourceObjectStorageEnabled, putResourceObjectFromPath } from "@/lib/resource-object-storage";
import { createImagePreview, createVideoPreview, getPreviewKind, MAX_RESOURCE_FILE_SIZE, removeStoredKeys, resolveStorageKey, storeUploadedFile } from "@/lib/resource-storage";

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

  const useOss = isResourceObjectStorageEnabled();
  let stored: Awaited<ReturnType<typeof storeUploadedFile>> | null = null;
  let storageKey: string | null = null;
  const temporaryKeys: string[] = [];
  let storedSize = value.size;
  try {
    if (useOss) {
      const extension = safeExtension(name);
      const temporaryKey = path.posix.join("temp", `resource-${randomUUID()}${extension}`);
      stored = await storeUploadedFile(value, temporaryKey);
      temporaryKeys.push(temporaryKey);
      storageKey = createResourceObjectKey("originals", randomUUID(), name);
      await putResourceObjectFromPath(storageKey, stored.absolutePath, value.type || "application/octet-stream");
    } else {
      storageKey = await getResourceOriginalFileKey(projectId, folderId, name);
      stored = await storeUploadedFile(value, storageKey);
    }
  } catch (error) {
    await Promise.all([
      removeResourceStorageKeys([storageKey]),
      removeStoredKeys(useOss ? temporaryKeys : stored ? [stored.storageKey] : [])
    ]);
    return NextResponse.json({ message: error instanceof Error ? error.message : "文件保存失败" }, { status: 500 });
  }
  if (!stored || !storageKey) return NextResponse.json({ message: "文件保存失败" }, { status: 500 });

  const previewKind = sourcePreviewKind;
  const requiresConversion = previewKind === "image" || previewKind === "video";
  const initialStatus = previewKind === "pdf" ? "READY" : requiresConversion ? "PENDING" : "NONE";
  let file;
  let previewErrorMessage = "";
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
        storageKey,
        previewKey: initialStatus === "READY" ? storageKey : null,
        previewStatus: initialStatus,
        visibility: folder?.visibility ?? "ALL",
        uploadedById: auth.user.id
      }
    });
  } catch (error) {
    await Promise.all([removeResourceStorageKeys([storageKey]), removeStoredKeys(temporaryKeys)]);
    return NextResponse.json({ message: error instanceof Error ? error.message : "资料记录保存失败" }, { status: 500 });
  }

  if (requiresConversion) {
    const uploadedArtifacts: string[] = [];
    try {
      console.info("[resources/upload] preview generation started", {
        fileName: name,
        previewKind,
        useOss
      });
      const localResult: { previewKey: string; posterKey?: string } = previewKind === "image"
        ? await createImagePreview(stored)
        : await createVideoPreview(stored);
      let result = localResult;
      if (useOss) {
        temporaryKeys.push(localResult.previewKey, ...(localResult.posterKey ? [localResult.posterKey] : []));
        const previewExtension = previewKind === "video" ? ".mp4" : ".jpg";
        const previewMime = previewKind === "video" ? "video/mp4" : "image/jpeg";
        const previewKey = createResourceObjectKey("previews", file.id, `preview${previewExtension}`);
        await putResourceObjectFromPath(previewKey, resolveStorageKey(localResult.previewKey), previewMime);
        uploadedArtifacts.push(previewKey);
        let posterKey: string | undefined;
        if (localResult.posterKey) {
          posterKey = createResourceObjectKey("previews", file.id, "poster.jpg");
          await putResourceObjectFromPath(posterKey, resolveStorageKey(localResult.posterKey), "image/jpeg");
          uploadedArtifacts.push(posterKey);
        }
        result = { previewKey, posterKey };
      }
      file = await prisma.fileResource.update({
        where: { id: file.id },
        data: { previewKey: result.previewKey, posterKey: result.posterKey ?? null, previewStatus: "READY" }
      });
    } catch (error) {
      previewErrorMessage = error instanceof Error ? error.message : "未知错误";
      console.error("[resources/upload] preview generation failed", {
        fileId: file.id,
        fileName: file.fileName,
        previewKind,
        error
      });
      await removeResourceStorageKeys(uploadedArtifacts);
      file = await prisma.fileResource.update({ where: { id: file.id }, data: { previewStatus: "FAILED" } });
    }
  }

  await removeStoredKeys(temporaryKeys);

  return NextResponse.json({
    data: file,
    message: file.previewStatus === "FAILED" ? `上传成功，但预览生成失败：${previewErrorMessage || "请查看服务器日志"}` : "上传成功"
  }, { status: 201 });
}

function safeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : "";
}
