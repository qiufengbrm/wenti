/** 项目导读：接口路由 /api/resources：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { canAccessFolder, getBreadcrumbs, resourceVisibilityLabels } from "@/lib/resource-drive";
import { getPreviewKind } from "@/lib/resource-storage";
import type { CurrentUser } from "@/types/user";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() || null;
  const parentId = normalizeParentId(request.nextUrl.searchParams.get("parentId"));
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const dateFrom = parseSearchDate(request.nextUrl.searchParams.get("dateFrom"), false);
  const dateTo = parseSearchDate(request.nextUrl.searchParams.get("dateTo"), true);
  if (dateFrom === "invalid" || dateTo === "invalid") return NextResponse.json({ message: "搜索日期格式无效" }, { status: 400 });
  if (dateFrom && dateTo && dateFrom > dateTo) return NextResponse.json({ message: "开始日期不能晚于结束日期" }, { status: 400 });
  const dateFilter = dateFrom || dateTo ? { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } : undefined;
  const searchActive = Boolean(query || dateFilter);
  const treeOnly = request.nextUrl.searchParams.get("tree") === "1";

  if (!projectId) {
    if (searchActive) {
      const fileRows = await prisma.fileResource.findMany({
        where: {
          ...(query ? { OR: [{ title: { contains: query } }, { fileName: { contains: query } }] } : {}),
          ...(dateFilter ? { createdAt: dateFilter } : {})
        },
        include: { uploadedBy: { select: { name: true } }, project: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" }
      });
      const files = [];
      for (const file of fileRows) {
        if (!(await canAccessResourceFile(auth.user, file))) continue;
        const previewKind = file.storageKey ? getPreviewKind(file.fileName ?? file.title, file.fileType) : "none";
        const breadcrumbs = file.projectId ? await getBreadcrumbs(file.projectId, file.folderId) : [];
        files.push({
          kind: "file" as const,
          id: file.id,
          name: file.title,
          parentId: file.folderId,
          originalName: file.fileName ?? file.title,
          mimeType: file.fileType ?? "application/octet-stream",
          size: file.fileSize,
          owner: file.uploadedBy.name,
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
          previewStatus: file.previewStatus,
          previewKind,
          canPreview: previewKind === "pdf" || previewKind === "office" || (["image", "video"].includes(previewKind) && file.previewStatus === "READY"),
          hasPoster: Boolean(file.posterKey),
          isLegacyLink: !file.storageKey && Boolean(file.fileUrl),
          projectId: file.project?.id ?? null,
          projectName: file.project?.name ?? "未归档项目",
          folderPath: breadcrumbs.length > 1 ? breadcrumbs.slice(1).map((item) => item.name).join(" / ") : "项目根目录"
        });
      }
      return NextResponse.json({ data: { view: "search", projects: [], folders: [], files, breadcrumbs: [], searchMode: true, currentProject: null } });
    }

    const projects = await prisma.resourceProject.findMany({
      include: { createdBy: { select: { name: true } }, _count: { select: { folders: true, files: true } } },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({
      data: {
        view: "projects",
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          owner: project.createdBy.name,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          folderCount: project._count.folders,
          fileCount: project._count.files
        })),
        folders: [], files: [], breadcrumbs: [], searchMode: false, currentProject: null
      }
    });
  }

  const project = await prisma.resourceProject.findUnique({ where: { id: projectId }, select: { id: true, name: true, description: true } });
  if (!project) return NextResponse.json({ message: "活动项目不存在" }, { status: 404 });

  if (parentId) {
    const folder = await prisma.resourceFolder.findUnique({ where: { id: parentId }, select: { id: true, projectId: true } });
    if (!folder || folder.projectId !== projectId || !(await canAccessFolder(auth.user, parentId))) {
      return NextResponse.json({ message: "目录不存在或无权访问" }, { status: 404 });
    }
  }

  const folderWhere = treeOnly || searchActive ? { projectId } : { projectId, parentId };
  const fileWhere = searchActive
    ? {
        projectId,
        ...(query ? { OR: [{ title: { contains: query } }, { fileName: { contains: query } }] } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {})
      }
    : treeOnly ? { id: "__none__" } : { projectId, folderId: parentId };
  const [folderRows, fileRows, breadcrumbs] = await Promise.all([
    prisma.resourceFolder.findMany({
      where: query && !dateFilter ? { projectId, name: { contains: query } } : searchActive ? { id: "__none__" } : folderWhere,
      include: { createdBy: { select: { name: true } }, _count: { select: { children: true, files: true } } },
      orderBy: { name: "asc" }
    }),
    prisma.fileResource.findMany({
      where: fileWhere,
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { title: "asc" }
    }),
    getBreadcrumbs(projectId, parentId)
  ]);

  const folders = [];
  for (const folder of folderRows) {
    if (await canAccessFolder(auth.user, folder.id)) {
      folders.push({
        kind: "folder" as const,
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        visibility: folder.visibility,
        visibilityLabel: resourceVisibilityLabels[folder.visibility],
        owner: folder.createdBy.name,
        updatedAt: folder.updatedAt.toISOString(),
        childCount: folder._count.children + folder._count.files
      });
    }
  }

  const files = [];
  for (const file of fileRows) {
    const allowed = file.folderId
      ? await canAccessFolder(auth.user, file.folderId)
      : auth.user.role !== "volunteer" || file.visibility === "ALL" || file.visibility === "VOLUNTEERS";
    if (!allowed) continue;
    const previewKind = file.storageKey ? getPreviewKind(file.fileName ?? file.title, file.fileType) : "none";
    files.push({
      kind: "file" as const,
      id: file.id,
      name: file.title,
      parentId: file.folderId,
      originalName: file.fileName ?? file.title,
      mimeType: file.fileType ?? "application/octet-stream",
      size: file.fileSize,
      owner: file.uploadedBy.name,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
      previewStatus: file.previewStatus,
      previewKind,
      canPreview: previewKind === "pdf" || previewKind === "office" || (["image", "video"].includes(previewKind) && file.previewStatus === "READY"),
      hasPoster: Boolean(file.posterKey),
      isLegacyLink: !file.storageKey && Boolean(file.fileUrl)
    });
  }

  return NextResponse.json({ data: { view: "files", projects: [], folders, files, breadcrumbs, searchMode: searchActive, currentProject: project } });
}

function normalizeParentId(value: string | null) {
  return value && value !== "root" ? value : null;
}

function parseSearchDate(value: string | null, endOfDay: boolean) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid" as const;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}+08:00`);
  return Number.isNaN(date.getTime()) ? "invalid" as const : date;
}

async function canAccessResourceFile(user: CurrentUser, file: { folderId: string | null; visibility: string }) {
  if (file.folderId) return canAccessFolder(user, file.folderId);
  return user.role !== "volunteer" || file.visibility === "ALL" || file.visibility === "VOLUNTEERS";
}
