/** 项目导读：资料中心交互组件：目录、上传、移动和预览在此汇合，文件多但规矩不能像网盘会员一样忽隐忽现。 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronRight,
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  Info,
  LayoutGrid,
  MoreHorizontal,
  Move,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

type Visibility = "ALL" | "ADMINS" | "VOLUNTEERS";
type PreviewStatus = "NONE" | "PENDING" | "READY" | "FAILED";

interface FolderItem {
  kind: "folder";
  id: string;
  name: string;
  parentId: string | null;
  visibility: Visibility;
  visibilityLabel: string;
  owner: string;
  updatedAt: string;
  childCount: number;
}

interface FileItem {
  kind: "file";
  id: string;
  name: string;
  parentId: string | null;
  originalName: string;
  mimeType: string;
  size: number | null;
  owner: string;
  createdAt: string;
  updatedAt: string;
  previewStatus: PreviewStatus;
  previewKind: "pdf" | "image" | "video" | "office" | "none";
  canPreview: boolean;
  hasPoster: boolean;
  isLegacyLink: boolean;
  projectId?: string | null;
  projectName?: string;
  folderPath?: string;
}

type ResourceItem = FolderItem | FileItem;

interface DriveData {
  view: "projects" | "files" | "search";
  projects: ProjectItem[];
  folders: FolderItem[];
  files: FileItem[];
  breadcrumbs: Array<{ id: string | null; name: string }>;
  searchMode: boolean;
  currentProject: { id: string; name: string; description: string | null } | null;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  owner: string;
  createdAt: string;
  updatedAt: string;
  folderCount: number;
  fileCount: number;
}

interface UploadEntry {
  id: string;
  file: globalThis.File;
  progress: number;
  status: "waiting" | "uploading" | "success" | "error";
  message?: string;
}

interface DropDestination {
  id: string | null;
  name: string;
}

const BREADCRUMB_DWELL_MS = 650;
const PROJECT_ROOT_BREADCRUMB_KEY = "__project-root__";

const visibilityOptions: Array<{ value: Visibility; label: string }> = [
  { value: "ALL", label: "全体可见" },
  { value: "ADMINS", label: "仅管理员" },
  { value: "VOLUNTEERS", label: "仅志愿者" }
];

export function ResourceDrive({ isAdmin = false }: { isAdmin?: boolean }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState<DriveData>({ view: "projects", projects: [], folders: [], files: [], breadcrumbs: [], searchMode: false, currentProject: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionItem, setActionItem] = useState<FolderItem | FileItem | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ mode: "create" | "edit"; folder?: FolderItem } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<FolderItem | FileItem | null>(null);
  const [projectDialog, setProjectDialog] = useState<{ mode: "create" | "edit"; project?: ProjectItem } | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [draggedFiles, setDraggedFiles] = useState<FileItem[]>([]);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [breadcrumbDragTargetKey, setBreadcrumbDragTargetKey] = useState<string | null>(null);
  const [openedBreadcrumbKey, setOpenedBreadcrumbKey] = useState<string | null>(null);
  const [dropConfirmation, setDropConfirmation] = useState<{ files: FileItem[]; destination: DropDestination } | null>(null);
  const [batchMoveOpen, setBatchMoveOpen] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const breadcrumbDwellTimerRef = useRef<number | null>(null);

  const restoreDriveLocation = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const nextProjectId = params.get("project") || null;
    const nextFolderId = nextProjectId ? params.get("folder") || null : null;
    setLoading(true);
    setProjectId(nextProjectId);
    setFolderId(nextFolderId);
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setActionItem(null);
    setSelectedKeys(new Set());
  }, []);

  useEffect(() => {
    restoreDriveLocation();
    // 浏览器前进后退只恢复资料中心内部位置，不再一脚把人踹回首页。
    window.addEventListener("popstate", restoreDriveLocation);
    return () => window.removeEventListener("popstate", restoreDriveLocation);
  }, [restoreDriveLocation]);

  const loadResources = useCallback(async (currentFolderId = folderId, currentQuery = query, currentProjectId = projectId, currentDateFrom = dateFrom, currentDateTo = dateTo) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (currentProjectId) params.set("projectId", currentProjectId);
    if (currentFolderId) params.set("parentId", currentFolderId);
    if (currentQuery.trim()) params.set("q", currentQuery.trim());
    if (currentDateFrom) params.set("dateFrom", currentDateFrom);
    if (currentDateTo) params.set("dateTo", currentDateTo);
    try {
      const response = await fetch(`/api/resources?${params}`, { cache: "no-store" });
      const result = (await response.json()) as { data?: DriveData; message?: string };
      if (!response.ok || !result.data) throw new Error(result.message || "资料加载失败");
      setData(result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "资料加载失败");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, folderId, projectId, query]);

  useEffect(() => {
    // 关键词输入稍等 300ms 再查询，用户还没打完字，服务器先别抢答。
    const timeout = window.setTimeout(() => loadResources(folderId, query, projectId, dateFrom, dateTo), query ? 300 : 0);
    return () => window.clearTimeout(timeout);
  }, [dateFrom, dateTo, folderId, loadResources, projectId, query]);

  function writeDriveHistory(nextProjectId: string | null, nextFolderId: string | null) {
    // 每层目录都写入浏览器历史，返回键才能像返回键，不像“回到解放前”键。
    const url = new URL(window.location.href);
    if (nextProjectId) url.searchParams.set("project", nextProjectId);
    else url.searchParams.delete("project");
    if (nextProjectId && nextFolderId) url.searchParams.set("folder", nextFolderId);
    else url.searchParams.delete("folder");
    url.hash = "";
    window.history.pushState({ resourceDrive: true, projectId: nextProjectId, folderId: nextFolderId }, "", url);
  }

  function enterProject(id: string) {
    if (projectId === id && folderId === null) return;
    writeDriveHistory(id, null);
    setLoading(true);
    setProjectId(id);
    setFolderId(null);
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setError("");
  }

  function returnToProjects() {
    if (projectId === null) return;
    writeDriveHistory(null, null);
    setLoading(true);
    setProjectId(null);
    setFolderId(null);
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setActionItem(null);
  }

  function enterFolder(id: string | null) {
    if (!projectId || folderId === id) return;
    writeDriveHistory(projectId, id);
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setFolderId(id);
    setActionItem(null);
  }

  function clearBreadcrumbDragTarget() {
    if (breadcrumbDwellTimerRef.current !== null) {
      window.clearTimeout(breadcrumbDwellTimerRef.current);
      breadcrumbDwellTimerRef.current = null;
    }
    setBreadcrumbDragTargetKey(null);
    setOpenedBreadcrumbKey(null);
  }

  useEffect(() => () => {
    if (breadcrumbDwellTimerRef.current !== null) window.clearTimeout(breadcrumbDwellTimerRef.current);
  }, []);

  async function renameItem(item: FolderItem | FileItem) {
    const name = window.prompt("请输入新名称", item.name)?.trim();
    if (!name || name === item.name) return;
    await mutate(`/api/resources/${item.kind === "folder" ? "folders" : "files"}/${item.id}`, "PATCH", { name });
  }

  async function deleteItem(item: FolderItem | FileItem) {
    let detail = "此操作无法恢复。";
    if (item.kind === "folder") {
      const response = await fetch(`/api/resources/folders/${item.id}`);
      const result = (await response.json()) as { data?: { folderCount: number; fileCount: number } };
      if (result.data) detail = `将永久删除 ${result.data.folderCount} 个文件夹和 ${result.data.fileCount} 个文件。`;
    }
    if (!window.confirm(`确定删除“${item.name}”吗？\n${detail}`)) return;
    await mutate(`/api/resources/${item.kind === "folder" ? "folders" : "files"}/${item.id}`, "DELETE");
  }

  async function mutate(url: string, method: "PATCH" | "DELETE", body?: object) {
    setError("");
    setActionItem(null);
    try {
      const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "操作失败");
      setMoveTarget(null);
      await loadResources();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "操作失败");
    }
  }

  async function moveItems(itemsToMove: ResourceItem[], parentId: string | null) {
    if (!itemsToMove.length || batchBusy) return;
    setBatchBusy(true);
    setError("");
    const failures: string[] = [];

    for (const item of itemsToMove) {
      const response = await fetch(`/api/resources/${item.kind === "folder" ? "folders" : "files"}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId })
      }).catch(() => null);
      const result = response ? await response.json().catch(() => ({})) as { message?: string } : {};
      if (!response?.ok) failures.push(`${item.name}：${result.message ?? "移动失败"}`);
    }

    setBatchBusy(false);
    setBatchMoveOpen(false);
    setDropConfirmation(null);
    setDraggedFiles([]);
    setDropTargetId(null);
    clearBreadcrumbDragTarget();
    setSelectedKeys(new Set());
    if (failures.length) setError(`部分项目未能移动：${failures.join("；")}`);
    await loadResources();
  }

  async function deleteSelectedItems(itemsToDelete: ResourceItem[]) {
    if (!itemsToDelete.length || batchBusy) return;
    if (!window.confirm(`确定永久删除选中的 ${itemsToDelete.length} 项吗？\n文件夹中的内容也会被删除，此操作无法恢复。`)) return;
    setBatchBusy(true);
    setError("");
    const failures: string[] = [];

    for (const item of itemsToDelete) {
      const response = await fetch(`/api/resources/${item.kind === "folder" ? "folders" : "files"}/${item.id}`, { method: "DELETE" }).catch(() => null);
      const result = response ? await response.json().catch(() => ({})) as { message?: string } : {};
      if (!response?.ok) failures.push(`${item.name}：${result.message ?? "删除失败"}`);
    }

    setBatchBusy(false);
    setSelectedKeys(new Set());
    if (failures.length) setError(`部分项目未能删除：${failures.join("；")}`);
    await loadResources();
  }

  async function deleteProject(project: ProjectItem) {
    const response = await fetch(`/api/resources/projects/${project.id}`);
    const result = (await response.json()) as { data?: { folderCount: number; fileCount: number }; message?: string };
    const detail = result.data ? `其中有 ${result.data.folderCount} 个文件夹和 ${result.data.fileCount} 个文件。` : "其中所有资料都会被永久删除。";
    if (!window.confirm(`确定永久删除活动项目“${project.name}”吗？\n${detail}\n此操作无法恢复。`)) return;
    await mutate(`/api/resources/projects/${project.id}`, "DELETE");
  }

  const items = useMemo(() => [...data.folders, ...data.files], [data]);
  const selectedItems = useMemo(() => items.filter((item) => selectedKeys.has(resourceKey(item))), [items, selectedKeys]);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  useEffect(() => {
    setSelectedKeys((current) => new Set(Array.from(current).filter((key) => items.some((item) => resourceKey(item) === key))));
  }, [items]);

  function toggleSelection(item: ResourceItem) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      const key = resourceKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelectedKeys(allSelected ? new Set() : new Set(items.map(resourceKey)));
  }

  function beginFileDrag(file: FileItem, event: React.DragEvent<HTMLTableRowElement>) {
    const selectedFiles = selectedItems.filter((item): item is FileItem => item.kind === "file");
    const files = selectedKeys.has(resourceKey(file)) && selectedFiles.length > 1 ? selectedFiles : [file];
    clearBreadcrumbDragTarget();
    setDraggedFiles(files);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", files.map((item) => item.name).join("、"));
  }

  function dropFilesIntoFolder(folder: FolderItem, event: React.DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDropTargetId(null);
    clearBreadcrumbDragTarget();
    if (draggedFiles.length) setDropConfirmation({ files: draggedFiles, destination: { id: folder.id, name: folder.name } });
  }

  function beginBreadcrumbDwell(breadcrumb: DropDestination) {
    if (!draggedFiles.length) return;
    const key = breadcrumbKey(breadcrumb.id);
    setDropTargetId(null);
    if (breadcrumbDragTargetKey === key) return;
    if (breadcrumbDwellTimerRef.current !== null) window.clearTimeout(breadcrumbDwellTimerRef.current);
    setBreadcrumbDragTargetKey(key);
    setOpenedBreadcrumbKey(null);

    if (breadcrumb.id === folderId && !query) {
      setOpenedBreadcrumbKey(key);
      return;
    }

    // 在面包屑上停一会儿才自动进目录，路过不算，真想进去才开门。
    breadcrumbDwellTimerRef.current = window.setTimeout(() => {
      breadcrumbDwellTimerRef.current = null;
      setOpenedBreadcrumbKey(key);
      enterFolder(breadcrumb.id);
    }, BREADCRUMB_DWELL_MS);
  }

  function leaveBreadcrumbDwell(breadcrumb: DropDestination, event: React.DragEvent<HTMLButtonElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    if (breadcrumbDragTargetKey === breadcrumbKey(breadcrumb.id)) clearBreadcrumbDragTarget();
  }

  function dropFilesIntoBreadcrumb(breadcrumb: DropDestination, event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    clearBreadcrumbDragTarget();
    if (draggedFiles.length) setDropConfirmation({ files: draggedFiles, destination: breadcrumb });
  }

  function finishFileDrag() {
    setDraggedFiles([]);
    setDropTargetId(null);
    clearBreadcrumbDragTarget();
  }

  if (!projectId) {
    return <>
      <ProjectOverview dateFrom={dateFrom} dateTo={dateTo} error={error} files={data.files} isAdmin={isAdmin} loading={loading} onCreate={() => setProjectDialog({ mode: "create" })} onDateFrom={setDateFrom} onDateTo={setDateTo} onDelete={deleteProject} onEdit={(project) => setProjectDialog({ mode: "edit", project })} onEnter={enterProject} onQuery={setQuery} projects={data.projects} query={query} searchMode={data.searchMode} />
      {projectDialog ? <ProjectEditor dialog={projectDialog} onClose={() => setProjectDialog(null)} onSaved={async () => { setProjectDialog(null); await loadResources(null, query, null, dateFrom, dateTo); }} /> : null}
    </>;
  }

  return (
    <div className="grid gap-4">
      <Card className="relative z-10 overflow-visible p-3 sm:p-4">
        <div className="grid gap-3 lg:flex lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button className="w-full sm:w-auto" onClick={() => setUploadOpen(true)}><Upload className="mr-2" size={16} />上传文件</Button><Button className="w-full sm:w-auto" onClick={() => setFolderDialog({ mode: "create" })} variant="secondary"><FolderPlus className="mr-2" size={16} />新建文件夹</Button>
          </div>
          <ResourceSearchControls compact dateFrom={dateFrom} dateTo={dateTo} onDateFrom={setDateFrom} onDateTo={setDateTo} onQuery={setQuery} query={query} scopeLabel={data.currentProject?.name ?? "当前项目"} />
        </div>
      </Card>

      <Card className="overflow-hidden p-0 sm:overflow-visible">
        <div className="flex min-h-12 min-w-0 items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm sm:px-4">
          <div className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              aria-label="返回全部活动项目"
              className="mr-1 inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-xs font-semibold text-[#515154] shadow-[0_1px_2px_rgba(0,0,0,.04)] transition hover:border-[#0071e3]/25 hover:bg-[#0071e3]/[0.06] hover:text-[#0066cc] active:scale-[0.97] sm:min-h-8"
              onClick={returnToProjects}
              title="返回活动项目列表"
              type="button"
            >
              <LayoutGrid size={15} />
              <span>全部项目</span>
            </button>
            <div className="flex min-w-max items-center">
              {data.searchMode ? <span className="px-2 text-slate-600">“{query}”的搜索结果</span> : data.breadcrumbs.map((breadcrumb, index) => {
                const key = breadcrumbKey(breadcrumb.id);
                const dragActive = breadcrumbDragTargetKey === key;
                const dwellComplete = openedBreadcrumbKey === key;
                const isCurrent = index === data.breadcrumbs.length - 1;
                return <span className="flex shrink-0 items-center" key={key}>
                  <button
                    aria-label={draggedFiles.length ? `${breadcrumb.name}，可拖放文件到此目录` : undefined}
                    className={`relative min-h-9 rounded-[8px] px-2 py-1 transition-[color,background-color,box-shadow] duration-150 sm:min-h-0 ${dragActive ? "z-20 bg-[#0071e3]/10 text-[#0066cc] shadow-[inset_0_0_0_1px_rgba(0,113,227,.24)]" : isCurrent ? "font-medium text-slate-800" : "text-blue-600 hover:bg-[#0071e3]/[0.07]"}`}
                    onClick={() => enterFolder(breadcrumb.id)}
                    onDragEnter={draggedFiles.length ? () => beginBreadcrumbDwell(breadcrumb) : undefined}
                    onDragLeave={draggedFiles.length ? (event) => leaveBreadcrumbDwell(breadcrumb, event) : undefined}
                    onDragOver={draggedFiles.length ? (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } : undefined}
                    onDrop={draggedFiles.length ? (event) => dropFilesIntoBreadcrumb(breadcrumb, event) : undefined}
                    type="button"
                  >
                    {breadcrumb.name}
                    {dragActive && !dwellComplete ? <span aria-hidden="true" className="breadcrumb-dwell-progress absolute inset-x-1 bottom-0 h-0.5 origin-left rounded-full bg-[#0071e3]" /> : null}
                    {dragActive ? <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-max -translate-x-1/2 rounded-[8px] bg-[#1d1d1f]/90 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-floating">{dwellComplete ? "松开后确认移动到此目录" : "停留以打开，松开后确认移动"}</span> : null}
                  </button>
                  {index < data.breadcrumbs.length - 1 ? <ChevronRight className="mx-0.5 text-slate-300" size={16} /> : null}
                </span>;
              })}
            </div>
          </div>
          <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{items.length} 项</span>
        </div>

        {selectedItems.length > 0 ? (
          <div className="grid grid-cols-2 items-center gap-2 border-b border-[#0071e3]/10 bg-[#0071e3]/[0.055] px-3 py-2.5 sm:flex sm:flex-wrap sm:px-4" role="toolbar" aria-label="批量操作">
            <span className="col-span-2 text-[13px] font-semibold text-[#0066cc] sm:mr-auto">已选择 {selectedItems.length} 项</span>
            <Button className="w-full sm:w-auto" onClick={() => downloadResourceItems(selectedItems)}><Download className="mr-1.5" size={15} />批量下载</Button>
            {isAdmin ? <Button className="w-full sm:w-auto" disabled={batchBusy} onClick={() => setBatchMoveOpen(true)} variant="secondary"><Move className="mr-1.5" size={15} />批量移动</Button> : null}
            {isAdmin ? <button className="inline-flex min-h-11 items-center justify-center rounded-[10px] px-3 text-[13px] font-semibold text-[#d70015] transition-colors hover:bg-[#ff3b30]/10 disabled:opacity-45 sm:min-h-9" disabled={batchBusy} onClick={() => deleteSelectedItems(selectedItems)} type="button"><Trash2 className="mr-1.5" size={15} />批量删除</button> : null}
            <Button className="col-span-2 w-full sm:w-auto" disabled={batchBusy} onClick={() => setSelectedKeys(new Set())} variant="ghost">取消选择</Button>
          </div>
        ) : null}

        <div className="flex items-start gap-2.5 border-b border-amber-500/15 bg-amber-500/[0.07] px-3 py-2.5 text-[12px] leading-5 text-amber-800 sm:px-4">
          <Info className="mt-0.5 shrink-0" size={15} />
          <p>Office 文件预览由系统自动转换为 PDF，排版和格式可能与原文件不同；正式使用请下载原文件。</p>
        </div>
        {error ? <div className="m-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {loading ? <div className="py-16 text-center text-sm text-slate-500">正在加载资料...</div> : items.length ? (
          <>
            <MobileResourceList isAdmin={isAdmin} items={items} onDownload={downloadResourceItem} onEnter={enterFolder} onMenu={setActionItem} onPreview={openFilePreview} onSelect={toggleSelection} selectedKeys={selectedKeys} />
          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500"><tr><th className="w-12 px-4 py-3"><input aria-label="选择当前目录全部项目" checked={allSelected} onChange={toggleAll} type="checkbox" /></th><th className="px-4 py-3">名称</th><th className="w-24 whitespace-nowrap px-4 py-3">大小</th><th className="hidden px-4 py-3 xl:table-cell">上传人</th><th className="hidden px-4 py-3 lg:table-cell">更新时间</th><th className="w-16 px-4 py-3">下载</th>{isAdmin ? <th className="w-16 px-4 py-3">操作</th> : null}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => <ResourceRow dragged={item.kind === "file" && draggedFiles.some((file) => file.id === item.id)} draggingFiles={draggedFiles.length > 0} dropActive={item.kind === "folder" && dropTargetId === item.id} isAdmin={isAdmin} item={item} key={`${item.kind}-${item.id}`} onDownload={downloadResourceItem} onDragEnd={finishFileDrag} onDragEnter={(folder) => { clearBreadcrumbDragTarget(); setDropTargetId(folder.id); }} onDragLeave={(folder, event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTargetId((current) => current === folder.id ? null : current); }} onDragStart={beginFileDrag} onDrop={dropFilesIntoFolder} onEnter={enterFolder} onMenu={setActionItem} onPreview={openFilePreview} onSelect={toggleSelection} selected={selectedKeys.has(resourceKey(item))} />)}
              </tbody>
            </table>
          </div>
          </>
        ) : <div className="py-16 text-center"><Folder className="mx-auto text-slate-300" size={40} /><p className="mt-3 font-medium text-slate-700">{query ? "没有找到匹配的资料" : "这个文件夹还是空的"}</p><p className="mt-1 text-sm text-slate-400">{!query ? "可以新建文件夹或上传文件" : ""}</p></div>}
      </Card>

      {folderDialog ? <FolderEditor currentFolderId={folderId} dialog={folderDialog} isAdmin={isAdmin} onClose={() => setFolderDialog(null)} onSaved={async () => { setFolderDialog(null); await loadResources(); }} projectId={projectId} /> : null}
      {uploadOpen ? <UploadDialog folderId={folderId} onClose={() => setUploadOpen(false)} onFinished={loadResources} projectId={projectId} /> : null}
      {moveTarget ? <MoveDialog item={moveTarget} onClose={() => setMoveTarget(null)} onMove={(parentId) => mutate(`/api/resources/${moveTarget.kind === "folder" ? "folders" : "files"}/${moveTarget.id}`, "PATCH", { parentId })} projectId={projectId} /> : null}
      {batchMoveOpen ? <BatchMoveDialog items={selectedItems} onClose={() => setBatchMoveOpen(false)} onMove={(parentId) => moveItems(selectedItems, parentId)} projectId={projectId} /> : null}
      {dropConfirmation ? <DropMoveConfirmation busy={batchBusy} destination={dropConfirmation.destination} files={dropConfirmation.files} onCancel={() => { setDropConfirmation(null); setDraggedFiles([]); clearBreadcrumbDragTarget(); }} onConfirm={() => moveItems(dropConfirmation.files, dropConfirmation.destination.id)} /> : null}
      {actionItem ? <ActionDialog item={actionItem} onClose={() => setActionItem(null)} onDelete={() => deleteItem(actionItem)} onDownload={() => downloadResourceItem(actionItem)} onEditFolder={() => actionItem.kind === "folder" && setFolderDialog({ mode: "edit", folder: actionItem })} onMove={() => setMoveTarget(actionItem)} onPreview={() => actionItem.kind === "file" && openFilePreview(actionItem)} onRename={() => renameItem(actionItem)} /> : null}
    </div>
  );
}

function ProjectOverview({ dateFrom, dateTo, error, files, isAdmin, loading, onCreate, onDateFrom, onDateTo, onDelete, onEdit, onEnter, onQuery, projects, query, searchMode }: { dateFrom: string; dateTo: string; error: string; files: FileItem[]; isAdmin: boolean; loading: boolean; onCreate: () => void; onDateFrom: (value: string) => void; onDateTo: (value: string) => void; onDelete: (project: ProjectItem) => void; onEdit: (project: ProjectItem) => void; onEnter: (id: string) => void; onQuery: (value: string) => void; projects: ProjectItem[]; query: string; searchMode: boolean }) {
  const monthGroups = useMemo(() => groupProjectsByMonth(projects), [projects]);

  return <div className="grid gap-5">
    <Card className="relative z-10 overflow-visible p-4"><div className="grid gap-4"><div className="flex flex-wrap items-center justify-between gap-3"><div>{isAdmin ? <Button onClick={onCreate}><Plus className="mr-2" size={17} />创建活动项目</Button> : <p className="text-sm text-slate-500">选择一个活动项目进入资料空间</p>}</div><p className="text-xs text-[#86868b]">可跨全部项目精确检索文件名和上传日期</p></div><div className="flex items-start gap-2.5 rounded-[11px] border border-[#0071e3]/15 bg-[#0071e3]/[0.055] px-3 py-2.5 text-[12px] leading-5 text-[#315b7d]"><Info className="mt-0.5 shrink-0 text-[#0071e3]" size={15} /><p>服务器最大上传和下载速率约为 1–2 MB/s，大文件传输需要较长时间，请保持页面和网络连接。</p></div><ResourceSearchControls dateFrom={dateFrom} dateTo={dateTo} onDateFrom={onDateFrom} onDateTo={onDateTo} onQuery={onQuery} query={query} scopeLabel="全部项目" /></div></Card>
    {error ? <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
    {loading ? <div className="py-20 text-center text-sm text-slate-500">{searchMode ? "正在搜索文件..." : "正在加载活动项目..."}</div> : searchMode ? <GlobalFileSearchResults files={files} /> : projects.length ? <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_8rem] xl:grid-cols-[minmax(0,1fr)_10rem]">
      <div className="grid gap-10">
        {monthGroups.map((group) => <section aria-labelledby={`project-month-heading-${group.key}`} className="scroll-mt-28" id={`project-month-${group.key}`} key={group.key}>
          <div className="mb-4 flex items-center gap-3 sm:gap-4">
            <h2 className="shrink-0 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl" id={`project-month-heading-${group.key}`}>{group.label}</h2>
            <div aria-hidden="true" className="h-px min-w-4 flex-1 bg-slate-200" />
            <span className="shrink-0 text-xs text-slate-400">{group.projects.length} 个项目</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {group.projects.map((project) => <ProjectCard isAdmin={isAdmin} key={project.id} onDelete={onDelete} onEdit={onEdit} onEnter={onEnter} project={project} />)}
          </div>
        </section>)}
      </div>
      <ProjectTimeline groups={monthGroups} />
    </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center"><Folder className="mx-auto text-slate-300" size={46} /><p className="mt-3 font-medium text-slate-700">还没有活动项目</p><p className="mt-1 text-sm text-slate-400">{isAdmin ? "创建第一个活动项目后，大家就可以整理资料了" : ""}</p></div>}
  </div>;
}

function ResourceSearchControls({ compact = false, dateFrom, dateTo, onDateFrom, onDateTo, onQuery, query, scopeLabel }: { compact?: boolean; dateFrom: string; dateTo: string; onDateFrom: (value: string) => void; onDateTo: (value: string) => void; onQuery: (value: string) => void; query: string; scopeLabel: string }) {
  const active = Boolean(query || dateFrom || dateTo);
  return (
    <div className={`grid min-w-0 w-full gap-2.5 sm:gap-3 ${compact ? "sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-[minmax(15rem,1fr)_17rem_auto]" : "md:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_18rem_auto]"}`}>
      <label className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <input aria-label={`按文件名搜索${scopeLabel}`} className="h-11 w-full rounded-[10px] border border-black/[0.13] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10" onChange={(event) => onQuery(event.target.value)} placeholder={`搜索${scopeLabel}中的文件名`} value={query} />
      </label>
      <DateRangePicker ariaLabel="选择上传日期范围" endValue={dateTo} onChange={(start, end) => { onDateFrom(start); onDateTo(end); }} placeholder="选择上传日期范围" startValue={dateFrom} />
      <Button className="h-11 w-full" disabled={!active} onClick={() => { onQuery(""); onDateFrom(""); onDateTo(""); }} variant="secondary">清除筛选</Button>
    </div>
  );
}

function GlobalFileSearchResults({ files }: { files: FileItem[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-black/[0.07] px-4 py-3.5"><div><h2 className="text-sm font-semibold text-[#1d1d1f]">文件搜索结果</h2><p className="mt-0.5 text-xs text-[#86868b]">关键词匹配文件名，日期按上传时间筛选</p></div><span className="rounded-full bg-[#0071e3]/[0.08] px-2.5 py-1 text-xs font-semibold text-[#0066cc]">{files.length} 个文件</span></div>
      {files.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-black/[0.018] text-left text-xs font-medium text-[#6e6e73]"><tr><th className="px-4 py-3">文件名</th><th className="px-4 py-3">所属项目</th><th className="hidden px-4 py-3 md:table-cell">文件夹位置</th><th className="hidden px-4 py-3 sm:table-cell">上传时间</th><th className="hidden px-4 py-3 lg:table-cell">上传人</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{files.map((file) => <tr className="transition-colors hover:bg-[#0071e3]/[0.035]" key={file.id}><td className="px-4 py-3"><button className="flex min-w-0 items-center gap-3 text-left" onClick={() => openResourceFile(file)} type="button"><HoverPreviewIcon file={file} /><span className="max-w-md truncate font-medium text-[#1d1d1f] hover:text-[#0066cc]">{file.name}</span></button></td><td className="whitespace-nowrap px-4 py-3 text-[#515154]">{file.projectName ?? "-"}</td><td className="hidden max-w-xs truncate px-4 py-3 text-[#86868b] md:table-cell">{file.folderPath ?? "项目根目录"}</td><td className="hidden whitespace-nowrap px-4 py-3 text-[#86868b] sm:table-cell">{formatDate(file.createdAt)}</td><td className="hidden px-4 py-3 text-[#86868b] lg:table-cell">{file.owner}</td></tr>)}</tbody></table></div> : <div className="px-6 py-16 text-center"><Search className="mx-auto text-[#c7c7cc]" size={38} /><p className="mt-3 text-sm font-medium text-[#515154]">没有找到符合条件的文件</p><p className="mt-1 text-xs text-[#86868b]">可缩短文件名关键词或扩大上传日期范围</p></div>}
    </Card>
  );
}

function ProjectCard({ isAdmin, onDelete, onEdit, onEnter, project }: { isAdmin: boolean; onDelete: (project: ProjectItem) => void; onEdit: (project: ProjectItem) => void; onEnter: (id: string) => void; project: ProjectItem }) {
  return <article className="group relative overflow-hidden rounded-[14px] border border-black/[0.08] bg-white transition-[border-color,box-shadow,transform] duration-200 ease-apple-out hover:-translate-y-0.5 hover:border-[#0071e3]/25 hover:shadow-soft">
    <button className="flex min-h-44 w-full flex-col p-5 text-left" onClick={() => onEnter(project.id)}>
      <div className="flex w-full items-start gap-3 pr-16">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Folder className="fill-blue-100" size={24} /></span>
        <span className="min-w-0 pt-0.5"><h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">{project.name}</h3><span className="mt-1 block text-xs text-slate-400">{project.folderCount} 个文件夹 · {project.fileCount} 个文件</span></span>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-5 text-slate-500">{project.description || "暂无项目说明"}</p>
      <div className="mt-auto flex min-w-0 items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400"><CalendarDays className="shrink-0" size={14} /><span className="shrink-0">{formatProjectDate(project.createdAt)}</span><span>·</span><span className="truncate">{project.owner} 创建</span></div>
    </button>
    {isAdmin ? <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><button aria-label={`编辑项目${project.name}`} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600" onClick={() => onEdit(project)}><Pencil size={16} /></button><button aria-label={`删除项目${project.name}`} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(project)}><Trash2 size={16} /></button></div> : null}
  </article>;
}

function ProjectTimeline({ groups }: { groups: Array<{ key: string; label: string; projects: ProjectItem[] }> }) {
  const [activeKey, setActiveKey] = useState(groups[0]?.key ?? "");
  const [nodeProgress, setNodeProgress] = useState<Record<string, number>>({});
  const [railProgress, setRailProgress] = useState(0);
  const manualTargetRef = useRef<{ key: string; until: number } | null>(null);
  const activeIndex = Math.max(0, groups.findIndex((group) => group.key === activeKey));

  useEffect(() => {
    if (!groups.length) return;
    let frame = 0;

    function measureNodes() {
      const positions = groups.map((group) => {
        const heading = document.getElementById(`project-month-heading-${group.key}`);
        return { key: group.key, y: heading ? heading.getBoundingClientRect().top + window.scrollY : 0 };
      });
      const first = positions[0]?.y ?? 0;
      const last = positions[positions.length - 1]?.y ?? first;
      const range = Math.max(1, last - first);
      setNodeProgress(Object.fromEntries(positions.map((position) => [position.key, positions.length === 1 ? 0 : (position.y - first) / range])));
    }

    function scheduleMeasure() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measureNodes();
      });
    }

    const observer = new ResizeObserver(scheduleMeasure);
    groups.forEach((group) => {
      const section = document.getElementById(`project-month-${group.key}`);
      if (section) observer.observe(section);
    });
    scheduleMeasure();
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [groups]);

  useEffect(() => {
    if (!groups.length) return;
    let frame = 0;

    function updateActiveMonth() {
      const manualTarget = manualTargetRef.current;
      if (manualTarget && performance.now() < manualTarget.until) {
        setActiveKey(manualTarget.key);
        return;
      }
      manualTargetRef.current = null;
      const activationLine = Math.min(window.innerHeight * 0.35, 220);
      let nextKey = groups[0].key;
      const positions: number[] = [];
      let reachedFutureMonth = false;
      for (const group of groups) {
        const section = document.getElementById(`project-month-${group.key}`);
        if (section) positions.push(section.getBoundingClientRect().top + window.scrollY);
        if (!reachedFutureMonth && section && section.getBoundingClientRect().top <= activationLine) nextKey = group.key;
        else reachedFutureMonth = true;
      }
      const atPageBottom = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atPageBottom) nextKey = groups[groups.length - 1].key;
      const first = positions[0] ?? 0;
      const last = positions[positions.length - 1] ?? first;
      const probe = window.scrollY + activationLine;
      const progress = last === first ? 0 : Math.max(0, Math.min(1, (probe - first) / (last - first)));
      setRailProgress(atPageBottom ? 1 : progress);
      setActiveKey((current) => current === nextKey ? current : nextKey);
    }

    function scheduleUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveMonth();
      });
    }

    updateActiveMonth();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [groups]);

  function jumpToMonth(event: React.MouseEvent<HTMLAnchorElement>, key: string) {
    event.preventDefault();
    manualTargetRef.current = { key, until: performance.now() + 1200 };
    setActiveKey(key);
    setRailProgress(nodeProgress[key] ?? 0);
    document.getElementById(`project-month-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#project-month-${key}`);
  }

  return <aside aria-label="项目时间导航" className="hidden lg:block">
    <nav className="fixed bottom-8 right-5 top-24 z-20 w-36 xl:w-40">
      <div className="absolute inset-y-5 left-0 right-0">
      <div aria-hidden="true" className="absolute bottom-0 right-3 top-0 w-0.5 rounded-full bg-slate-300 shadow-sm" />
      {groups.map((group, index) => {
        const progress = nodeProgress[group.key];
        const isActive = index === activeIndex;
        return <a aria-current={isActive ? "true" : undefined} className={`absolute right-8 -translate-y-1/2 whitespace-nowrap text-xs transition-colors ${isActive ? "font-semibold text-blue-700" : "text-slate-400 hover:text-blue-600"}`} href={`#project-month-${group.key}`} key={group.key} onClick={(event) => jumpToMonth(event, group.key)} style={{ opacity: progress === undefined ? 0 : 1, top: `${(progress ?? 0) * 100}%` }}>{group.label}</a>;
      })}
      <span aria-hidden="true" className="absolute right-[5px] h-4 w-4 -translate-y-1/2 rounded-full border-[3px] border-blue-600 bg-white shadow-sm ring-4 ring-blue-100 transition-[top] duration-200 ease-out" style={{ top: `${railProgress * 100}%` }} />
      </div>
      <span className="sr-only">当前浏览：{groups[activeIndex]?.label}</span>
    </nav>
  </aside>;
}

function groupProjectsByMonth(projects: ProjectItem[]) {
  const groups = new Map<string, { label: string; projects: ProjectItem[] }>();
  projects.forEach((project) => {
    const date = new Date(project.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = groups.get(key);
    if (existing) existing.projects.push(project);
    else groups.set(key, { label: `${date.getFullYear()}年${date.getMonth() + 1}月`, projects: [project] });
  });
  return Array.from(groups, ([key, group]) => ({ key, ...group }));
}

function ProjectEditor({ dialog, onClose, onSaved }: { dialog: { mode: "create" | "edit"; project?: ProjectItem }; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(dialog.project?.name ?? "");
  const [description, setDescription] = useState(dialog.project?.description ?? "");
  const [projectDate, setProjectDate] = useState(formatDateInput(dialog.project?.createdAt));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!projectDate) { setError("请选择项目日期"); return; }
    setSaving(true); setError("");
    const response = await fetch(dialog.mode === "create" ? "/api/resources/projects" : `/api/resources/projects/${dialog.project?.id}`, { method: dialog.mode === "create" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, projectDate }) });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) { setError(result.message || "保存失败"); setSaving(false); return; }
    onSaved();
  }
  return <Modal title={dialog.mode === "create" ? "创建活动项目" : "编辑活动项目"} onClose={onClose}><form className="grid gap-5" onSubmit={save}><label className="grid gap-2 text-sm font-medium text-slate-700">项目名称<input autoFocus className={inputClass} maxLength={255} onChange={(event) => setName(event.target.value)} placeholder="例如：2026 校园歌手大赛" required value={name} /></label><div className="grid gap-2 text-sm font-medium text-slate-700"><span>项目日期</span><DatePicker ariaLabel="选择项目日期" onChange={setProjectDate} required value={projectDate} /><span className="font-normal text-xs text-slate-400">用于月份分组、项目排序和右侧时间轴。</span></div><label className="grid gap-2 text-sm font-medium text-slate-700">项目说明<textarea className="min-h-24 resize-y rounded-md border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" maxLength={2000} onChange={(event) => setDescription(event.target.value)} placeholder="简单说明活动和资料用途" value={description} /></label>{error ? <p className="text-sm text-red-600">{error}</p> : null}<div className="flex justify-end gap-3"><Button onClick={onClose} variant="secondary">取消</Button><Button disabled={saving} type="submit">{saving ? "保存中..." : "保存"}</Button></div></form></Modal>;
}

function MobileResourceList({ isAdmin, items, onDownload, onEnter, onMenu, onPreview, onSelect, selectedKeys }: { isAdmin: boolean; items: ResourceItem[]; onDownload: (item: ResourceItem) => void; onEnter: (id: string) => void; onMenu: (item: ResourceItem) => void; onPreview: (file: FileItem) => void; onSelect: (item: ResourceItem) => void; selectedKeys: Set<string> }) {
  function openItem(item: ResourceItem) {
    if (item.kind === "folder") {
      onEnter(item.id);
      return;
    }
    if (item.canPreview) onPreview(item);
    else window.open(`/api/resources/files/${item.id}/download`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-2 p-3 sm:hidden" role="list" aria-label="当前目录资料">
      {items.map((item) => {
        const selected = selectedKeys.has(resourceKey(item));
        return (
          <article className={`flex min-w-0 items-stretch overflow-hidden rounded-[13px] border bg-white transition-[border-color,background-color,transform] active:scale-[0.99] ${selected ? "border-[#0071e3]/30 bg-[#0071e3]/[0.045]" : "border-black/[0.075]"}`} key={resourceKey(item)} role="listitem">
            <label className="flex min-h-16 w-11 shrink-0 items-center justify-center border-r border-black/[0.055]" aria-label={`选择${item.name}`}><input checked={selected} onChange={() => onSelect(item)} type="checkbox" /></label>
            <button className="flex min-h-[4.75rem] min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left" onClick={() => openItem(item)} type="button">
              <span className="shrink-0">{item.kind === "file" ? <HoverPreviewIcon file={item} /> : <ResourceIcon item={item} />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold leading-5 text-slate-900">{item.name}</span>
                <span className="mt-1 block truncate text-[11px] leading-4 text-slate-500">{item.kind === "folder" ? `${item.childCount} 项${isAdmin ? ` · ${item.visibilityLabel}` : ""}` : previewLabel(item)}</span>
              </span>
              {item.kind === "folder" ? <ChevronRight className="shrink-0 text-slate-300" size={18} /> : null}
            </button>
            <span className="flex w-[3.75rem] shrink-0 items-center justify-center px-1 text-center text-[11px] font-medium tabular-nums text-slate-500">{item.kind === "file" ? formatSize(item.size) : "文件夹"}</span>
            <button aria-label={`下载${item.name}`} className="flex w-11 shrink-0 items-center justify-center border-l border-black/[0.055] text-[#0071e3] transition-colors active:bg-[#0071e3]/10" onClick={() => onDownload(item)} type="button"><Download size={18} /></button>
            {isAdmin ? <button aria-label={`管理${item.name}`} className="flex w-11 shrink-0 items-center justify-center border-l border-black/[0.055] text-slate-500 transition-colors active:bg-black/[0.055]" onClick={() => onMenu(item)} type="button"><MoreHorizontal size={19} /></button> : null}
          </article>
        );
      })}
    </div>
  );
}

function ResourceRow({ item, isAdmin, selected, dragged, draggingFiles, dropActive, onDownload, onEnter, onMenu, onPreview, onSelect, onDragStart, onDragEnd, onDragEnter, onDragLeave, onDrop }: { item: ResourceItem; isAdmin: boolean; selected: boolean; dragged: boolean; draggingFiles: boolean; dropActive: boolean; onDownload: (item: ResourceItem) => void; onEnter: (id: string) => void; onMenu: (item: ResourceItem) => void; onPreview: (file: FileItem) => void; onSelect: (item: ResourceItem) => void; onDragStart: (file: FileItem, event: React.DragEvent<HTMLTableRowElement>) => void; onDragEnd: () => void; onDragEnter: (folder: FolderItem) => void; onDragLeave: (folder: FolderItem, event: React.DragEvent<HTMLTableRowElement>) => void; onDrop: (folder: FolderItem, event: React.DragEvent<HTMLTableRowElement>) => void }) {
  const canDrag = isAdmin && item.kind === "file";
  return (
    <tr
      className={`group transition-[background-color,opacity,box-shadow] duration-150 ${selected ? "bg-[#0071e3]/[0.045]" : "hover:bg-slate-50"} ${dragged ? "opacity-45" : "opacity-100"} ${dropActive ? "relative z-10 bg-[#0071e3]/10 shadow-[inset_0_0_0_2px_rgba(0,113,227,.45)]" : ""}`}
      draggable={canDrag}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onDragEnter={item.kind === "folder" && draggingFiles ? () => onDragEnter(item) : undefined}
      onDragLeave={item.kind === "folder" && draggingFiles ? (event) => onDragLeave(item, event) : undefined}
      onDragOver={item.kind === "folder" && draggingFiles ? (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } : undefined}
      onDragStart={canDrag ? (event) => onDragStart(item, event) : undefined}
      onDrop={item.kind === "folder" && draggingFiles ? (event) => onDrop(item, event) : undefined}
      title={canDrag ? "可拖动到文件夹中移动" : undefined}
    >
      <td className="px-4 py-3"><input aria-label={`选择${item.name}`} checked={selected} onChange={() => onSelect(item)} onClick={(event) => event.stopPropagation()} type="checkbox" /></td>
      <td className="min-w-0 px-4 py-3">
        <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => item.kind === "folder" ? onEnter(item.id) : item.canPreview ? onPreview(item) : window.open(`/api/resources/files/${item.id}/download`, "_blank", "noopener,noreferrer")}>
          {item.kind === "file" ? <HoverPreviewIcon file={item} /> : <ResourceIcon item={item} />}
          <span className="min-w-0"><span className="block max-w-md truncate font-medium text-slate-800 group-hover:text-blue-700">{item.name}</span>{item.kind === "folder" ? <span className="mt-1 block text-xs text-slate-400">{dropActive ? "松开后确认移动到这里" : `${item.childCount} 项${isAdmin ? ` · ${item.visibilityLabel}` : ""}`}</span> : <span className="mt-1 block text-xs text-slate-400">{previewLabel(item)}</span>}</span>
        </button>
      </td>
      <td className="w-24 whitespace-nowrap px-4 py-3 text-slate-500">{item.kind === "file" ? formatSize(item.size) : "文件夹"}</td>
      <td className="hidden px-4 py-3 text-slate-500 xl:table-cell">{item.owner}</td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-slate-500 lg:table-cell">{formatDate(item.updatedAt)}</td>
      <td className="px-4 py-3"><button aria-label={`下载${item.name}`} className="rounded-md p-2 text-[#0071e3] hover:bg-[#0071e3]/10" onClick={() => onDownload(item)} type="button"><Download size={18} /></button></td>
      {isAdmin ? <td className="px-4 py-3"><button aria-label={`管理${item.name}`} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" onClick={() => onMenu(item)}><MoreHorizontal size={18} /></button></td> : null}
    </tr>
  );
}

function openFilePreview(file: FileItem) {
  window.open(`/api/resources/files/${file.id}/preview`, "_blank", "noopener,noreferrer");
}

function openResourceFile(file: FileItem) {
  const target = file.canPreview ? `/api/resources/files/${file.id}/preview` : `/api/resources/files/${file.id}/download`;
  window.open(target, "_blank", "noopener,noreferrer");
}

function downloadResourceItem(item: ResourceItem) {
  const target = item.kind === "folder" ? `/api/resources/folders/${item.id}/download` : `/api/resources/files/${item.id}/download`;
  window.open(target, "_blank", "noopener,noreferrer");
}

function downloadResourceItems(items: ResourceItem[]) {
  if (!items.length) return;
  // 用原生表单触发浏览器下载，ZIP 再大也不先绕进前端内存里兜一圈。
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/resources/download";
  form.style.display = "none";
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "selections";
  input.value = JSON.stringify(items.map((item) => ({ kind: item.kind, id: item.id })));
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function HoverPreviewIcon({ file }: { file: FileItem }) {
  const [layout, setLayout] = useState<{ height: number; left: number; top: number; width: number } | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
  }, []);

  function cancelHide() {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }

  function show(event: React.MouseEvent<HTMLSpanElement>) {
    if (!file.canPreview || !window.matchMedia("(hover: hover)").matches) return;
    cancelHide();
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(520, window.innerWidth - 24);
    const height = Math.min(410, window.innerHeight - 24);
    let left = rect.right + 8;
    if (left + width > window.innerWidth - 12) left = rect.left - width - 12;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    const top = Math.max(12, Math.min(rect.top + rect.height / 2 - height / 2, window.innerHeight - height - 12));
    showTimerRef.current = window.setTimeout(() => setLayout({ height, left, top, width }), 300);
  }

  function scheduleHide() {
    if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
    showTimerRef.current = null;
    cancelHide();
    hideTimerRef.current = window.setTimeout(() => setLayout(null), 300);
  }

  return <span className={`-m-1 shrink-0 rounded-md p-1 transition ${file.canPreview ? "cursor-zoom-in hover:bg-blue-50 hover:ring-2 hover:ring-blue-200" : ""}`} onMouseEnter={show} onMouseLeave={scheduleHide} title={file.canPreview ? "悬停快速预览" : undefined}><ResourceIcon item={file} />{layout && typeof document !== "undefined" ? createPortal(<HoverPreviewCard file={file} layout={layout} onEnter={cancelHide} onLeave={scheduleHide} />, document.body) : null}</span>;
}

function HoverPreviewCard({ file, layout, onEnter, onLeave }: { file: FileItem; layout: { height: number; left: number; top: number; width: number }; onEnter: () => void; onLeave: () => void }) {
  const previewUrl = `/api/resources/files/${file.id}/preview`;
  return <div className="fixed z-[70] flex overflow-hidden rounded-[14px] border border-black/[0.1] bg-white shadow-floating" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onMouseEnter={(event) => { event.stopPropagation(); onEnter(); }} onMouseLeave={(event) => { event.stopPropagation(); onLeave(); }} style={layout}>
    <div className="flex min-w-0 flex-1 flex-col">
    <div className="flex h-10 shrink-0 items-center border-b border-slate-100 bg-white px-3"><span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{file.name}</span><span className="ml-2 text-[11px] text-slate-400">可滚动预览</span></div>
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-100">
      {file.previewKind === "image" ? <img alt={`预览 ${file.name}`} className="h-full w-full object-contain" src={previewUrl} /> : null}
      {file.previewKind === "video" && file.hasPoster ? <><img alt={`视频封面 ${file.name}`} className="h-full w-full object-contain" src={`/api/resources/files/${file.id}/poster`} /><PlayCircle className="absolute text-white drop-shadow-lg" fill="rgba(15,23,42,.45)" size={46} /></> : null}
      {file.previewKind === "video" && !file.hasPoster ? <video className="h-full w-full object-contain" muted preload="metadata" src={previewUrl} /> : null}
      {file.previewKind === "pdf" || file.previewKind === "office" ? <iframe className="h-full w-full border-0 bg-white" src={`${previewUrl}#page=1&toolbar=0&navpanes=0&view=FitH`} title={`${file.name} 文档预览`} /> : null}
    </div>
    </div>
  </div>;
}

function ResourceIcon({ item }: { item: FolderItem | FileItem }) {
  if (item.kind === "folder") return <Folder className="shrink-0 fill-amber-100 text-amber-500" size={30} />;
  if (item.mimeType.startsWith("image/")) return <FileImage className="shrink-0 text-emerald-500" size={28} />;
  if (item.mimeType.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi|m4v)$/.test(item.name.toLowerCase())) return <FileVideo className="shrink-0 text-violet-500" size={28} />;
  if (/spreadsheet|excel/.test(item.mimeType) || /\.xlsx?$/.test(item.name.toLowerCase())) return <FileSpreadsheet className="shrink-0 text-emerald-600" size={28} />;
  if (/pdf|word|document/.test(item.mimeType) || /\.(pdf|docx?)$/.test(item.name.toLowerCase())) return <FileText className="shrink-0 text-blue-600" size={28} />;
  return <File className="shrink-0 text-slate-400" size={28} />;
}

function ActionDialog({ item, onClose, onDelete, onDownload, onEditFolder, onMove, onPreview, onRename }: { item: FolderItem | FileItem; onClose: () => void; onDelete: () => void; onDownload: () => void; onEditFolder: () => void; onMove: () => void; onPreview: () => void; onRename: () => void }) {
  return <Modal title={item.name} onClose={onClose}><div className="grid grid-cols-2 gap-3">{item.kind === "file" && item.canPreview ? <ActionButton icon={<Eye size={18} />} label="在线预览" onClick={() => { onClose(); onPreview(); }} /> : null}<ActionButton icon={<Download size={18} />} label={item.kind === "folder" ? "下载文件夹" : "下载原文件"} onClick={() => { onClose(); onDownload(); }} /><ActionButton icon={<Pencil size={18} />} label="重命名" onClick={onRename} /><ActionButton icon={<Move size={18} />} label="移动位置" onClick={() => { onClose(); onMove(); }} />{item.kind === "folder" ? <ActionButton icon={<Eye size={18} />} label="可见范围" onClick={() => { onClose(); onEditFolder(); }} /> : null}<ActionButton danger icon={<Trash2 size={18} />} label="永久删除" onClick={onDelete} /></div></Modal>;
}

function ActionButton({ danger = false, icon, label, onClick }: { danger?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`flex h-20 flex-col items-center justify-center gap-2 rounded-lg border text-sm font-medium transition ${danger ? "border-red-100 text-red-600 hover:bg-red-50" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`} onClick={onClick}>{icon}{label}</button>;
}

function FolderEditor({ currentFolderId, dialog, isAdmin, onClose, onSaved, projectId }: { currentFolderId: string | null; dialog: { mode: "create" | "edit"; folder?: FolderItem }; isAdmin: boolean; onClose: () => void; onSaved: () => void; projectId: string }) {
  const [name, setName] = useState(dialog.folder?.name ?? "");
  const [visibility, setVisibility] = useState<Visibility>(dialog.folder?.visibility ?? "ALL");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(""); const response = await fetch(dialog.mode === "create" ? "/api/resources/folders" : `/api/resources/folders/${dialog.folder?.id}`, { method: dialog.mode === "create" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, ...(isAdmin ? { visibility } : {}), ...(dialog.mode === "create" ? { parentId: currentFolderId, projectId } : {}) }) }); const result = (await response.json()) as { message?: string }; if (!response.ok) { setError(result.message || "保存失败"); setSaving(false); return; } onSaved(); }
  return <Modal title={dialog.mode === "create" ? "新建文件夹" : "文件夹设置"} onClose={onClose}><form className="grid gap-5" onSubmit={save}><label className="grid gap-2 text-sm font-medium text-slate-700">文件夹名称<input autoFocus className={inputClass} maxLength={255} onChange={(event) => setName(event.target.value)} required value={name} /></label>{isAdmin ? <label className="grid gap-2 text-sm font-medium text-slate-700">可见范围<select className={inputClass} onChange={(event) => setVisibility(event.target.value as Visibility)} value={visibility}>{visibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : <p className="text-xs text-slate-400">志愿者创建的文件夹默认对所有成员可见。</p>}{error ? <p className="text-sm text-red-600">{error}</p> : null}<div className="flex justify-end gap-3"><Button onClick={onClose} variant="secondary">取消</Button><Button disabled={saving} type="submit">{saving ? "保存中..." : "保存"}</Button></div></form></Modal>;
}

function UploadDialog({ folderId, onClose, onFinished, projectId }: { folderId: string | null; onClose: () => void; onFinished: () => void; projectId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  function addFiles(list: FileList | globalThis.File[]) { const incoming = Array.from(list).map((file) => ({ id: `${file.name}-${file.size}-${crypto.randomUUID()}`, file, progress: 0, status: file.size > 500 * 1024 * 1024 ? "error" as const : "waiting" as const, message: file.size > 500 * 1024 * 1024 ? "超过 500MB" : undefined })); setEntries((current) => [...current, ...incoming]); }
  async function start() { const waiting = entries.filter((entry) => entry.status === "waiting"); if (!waiting.length) return; setUploading(true); let cursor = 0; async function worker() { while (cursor < waiting.length) { const entry = waiting[cursor++]; await uploadOne(entry, projectId, folderId, (update) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, ...update } : item))); } } await Promise.all(Array.from({ length: Math.min(2, waiting.length) }, worker)); setUploading(false); onFinished(); }
  return <Modal large title="上传文件" onClose={() => !uploading && onClose()}><div className="grid gap-4"><button className="flex min-h-36 flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 text-center transition hover:border-blue-400 hover:bg-blue-50" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}><Upload className="text-blue-500" size={30} /><span className="mt-3 text-sm font-medium text-slate-700">拖拽文件到这里，或点击选择</span><span className="mt-1 text-xs text-slate-400">最多 100MB</span></button><input className="hidden" multiple onChange={(event) => event.target.files && addFiles(event.target.files)} ref={inputRef} type="file" />{entries.length ? <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">{entries.map((entry) => <div className="p-3" key={entry.id}><div className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-slate-700">{entry.file.name}</span><span className={entry.status === "error" ? "text-red-600" : entry.status === "success" ? "text-emerald-600" : "text-slate-400"}>{entry.message ?? uploadStatusLabel(entry.status)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100"><div className={`h-full transition-all ${entry.status === "error" ? "bg-red-400" : entry.status === "success" ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${entry.progress}%` }} /></div></div>)}</div> : null}<div className="flex flex-wrap items-center justify-end gap-3"><Button disabled={uploading} onClick={onClose} variant="secondary">关闭</Button><Button disabled={uploading || !entries.some((entry) => entry.status === "waiting")} onClick={start}>{uploading ? "上传中..." : "开始上传"}</Button></div></div></Modal>;
}

function uploadOne(entry: UploadEntry, projectId: string, folderId: string | null, update: (value: Partial<UploadEntry>) => void) { return new Promise<void>((resolve) => { const xhr = new XMLHttpRequest(); const form = new FormData(); form.append("file", entry.file); form.append("projectId", projectId); if (folderId) form.append("folderId", folderId); update({ status: "uploading", progress: 0 }); xhr.open("POST", "/api/resources/upload"); xhr.upload.onprogress = (event) => event.lengthComputable && update({ progress: Math.round((event.loaded / event.total) * 100) }); xhr.onload = () => { let message = ""; try { message = (JSON.parse(xhr.responseText) as { message?: string }).message ?? ""; } catch {} update(xhr.status >= 200 && xhr.status < 300 ? { status: "success", progress: 100, message: message || "上传成功" } : { status: "error", message: message || "上传失败" }); resolve(); }; xhr.onerror = () => { update({ status: "error", message: "网络错误" }); resolve(); }; xhr.send(form); }); }

function MoveDialog({ item, onClose, onMove, projectId }: { item: FolderItem | FileItem; onClose: () => void; onMove: (parentId: string | null) => void; projectId: string }) { const [folders, setFolders] = useState<FolderItem[]>([]); const [target, setTarget] = useState(""); useEffect(() => { fetch(`/api/resources?tree=1&projectId=${encodeURIComponent(projectId)}`).then((response) => response.json()).then((result: { data?: DriveData }) => setFolders(result.data?.folders ?? [])); }, [projectId]); return <Modal title={`移动“${item.name}”`} onClose={onClose}><div className="grid gap-5"><label className="grid gap-2 text-sm font-medium text-slate-700">目标文件夹<select className={inputClass} onChange={(event) => setTarget(event.target.value)} value={target}><option value="">项目根目录</option>{folders.filter((folder) => !(item.kind === "folder" && folder.id === item.id)).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><p className="text-xs text-slate-400">文件只能在当前活动项目内移动；系统会阻止循环目录。</p><div className="flex justify-end gap-3"><Button onClick={onClose} variant="secondary">取消</Button><Button onClick={() => onMove(target || null)}>确认移动</Button></div></div></Modal>; }

function BatchMoveDialog({ items, onClose, onMove, projectId }: { items: ResourceItem[]; onClose: () => void; onMove: (parentId: string | null) => void; projectId: string }) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [target, setTarget] = useState("");
  const selectedFolderIds = new Set(items.filter((item): item is FolderItem => item.kind === "folder").map((item) => item.id));

  useEffect(() => {
    fetch(`/api/resources?tree=1&projectId=${encodeURIComponent(projectId)}`)
      .then((response) => response.json())
      .then((result: { data?: DriveData }) => setFolders(result.data?.folders ?? []));
  }, [projectId]);

  return (
    <Modal title={`批量移动 ${items.length} 项`} onClose={onClose}>
      <div className="grid gap-5">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          目标文件夹
          <select className={inputClass} onChange={(event) => setTarget(event.target.value)} value={target}>
            <option value="">项目根目录</option>
            {folders.filter((folder) => !selectedFolderIds.has(folder.id)).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
        </label>
        <p className="text-xs leading-5 text-slate-500">将依次移动选中的文件和文件夹。系统会阻止循环目录和目标目录中的同名项目。</p>
        <div className="flex justify-end gap-3"><Button onClick={onClose} variant="secondary">取消</Button><Button onClick={() => onMove(target || null)}>确认批量移动</Button></div>
      </div>
    </Modal>
  );
}

function DropMoveConfirmation({ files, destination, busy, onCancel, onConfirm }: { files: FileItem[]; destination: DropDestination; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal title="确认移动文件" onClose={() => !busy && onCancel()}>
      <div className="grid gap-5">
        <div className="rounded-[12px] bg-[#0071e3]/[0.06] p-4">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">是否将 {files.length === 1 ? `“${files[0].name}”` : `${files.length} 个文件`} 移动到“{destination.name}”？</p>
          <p className="mt-2 text-[12px] leading-5 text-[#6e6e73]">确认前不会修改文件位置。移动后仍可通过“移动位置”或批量移动调整。</p>
        </div>
        {files.length > 1 ? <div className="max-h-36 overflow-y-auto rounded-[10px] border border-black/[0.07] bg-white px-3 py-2 text-[12px] text-[#515154]">{files.map((file) => <p className="truncate py-1" key={file.id}>{file.name}</p>)}</div> : null}
        <div className="flex justify-end gap-3"><Button disabled={busy} onClick={onCancel} variant="secondary">取消</Button><Button disabled={busy} onClick={onConfirm}>{busy ? "正在移动..." : "确认移动"}</Button></div>
      </div>
    </Modal>
  );
}

function Modal({ children, large = false, onClose, title }: { children: React.ReactNode; large?: boolean; onClose: () => void; title: string }) { return <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[3px]"><div className={`apple-material max-h-[90vh] w-full overflow-y-auto rounded-[16px] border border-white/70 shadow-floating ${large ? "max-w-2xl" : "max-w-md"}`} role="dialog" aria-modal="true" aria-label={title}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.07] bg-white/80 px-5 py-4 backdrop-blur-xl"><h2 className="font-semibold tracking-[-0.012em] text-[#1d1d1f]">{title}</h2><button aria-label="关闭" className="rounded-[9px] p-1.5 text-[#86868b] hover:bg-black/[0.055] hover:text-[#1d1d1f]" onClick={onClose}><X size={19} /></button></div><div className="p-5 sm:p-6">{children}</div></div></div>; }

const inputClass = "h-10 rounded-[10px] border border-black/[0.14] bg-white px-3 font-normal outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10";
function breadcrumbKey(id: string | null) { return id ?? PROJECT_ROOT_BREADCRUMB_KEY; }
function previewLabel(file: FileItem) { if (file.previewStatus === "PENDING") return "正在生成预览"; if (file.previewStatus === "FAILED") return "预览生成失败，可下载原文件"; if (file.previewKind === "video" && file.canPreview) return "支持视频在线播放"; if (file.previewKind === "image" && file.canPreview) return "已生成网页预览"; if (file.canPreview) return "支持在线预览"; if (file.isLegacyLink) return "旧版链接资料"; return "仅支持下载"; }
function uploadStatusLabel(status: UploadEntry["status"]) { return status === "waiting" ? "等待上传" : status === "uploading" ? "上传中" : status === "success" ? "上传成功" : "上传失败"; }
function formatSize(size: number | null) { if (size === null) return "-"; if (size < 1024) return `${size} B`; if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`; return `${(size / 1024 ** 2).toFixed(1)} MB`; }
function formatDateInput(value?: string) { const date = value ? new Date(value) : new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatProjectDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value)); }
function formatDate(value: string) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function resourceKey(item: ResourceItem) { return `${item.kind}:${item.id}`; }
