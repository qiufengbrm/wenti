/** 项目导读：教程组件：管理草稿、发布、附件和离开提醒；辛苦写的内容不能一返回就人间蒸发。 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bold, BookOpenCheck, FileText, ImagePlus, Italic, Loader2, Paperclip, Save, Strikethrough, Underline, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type TutorialInput = {
  id: string;
  title: string;
  content: string;
  contentFormat: string;
  category: string;
  visibility: "ALL" | "ADMINS" | "VOLUNTEERS" | "PRIVATE";
  status: "DRAFT" | "PUBLISHED";
  tags: string;
  isPinned: boolean;
  attachmentFileName: string | null;
  attachmentFileSize: number | null;
};

export function TutorialEditorForm({ tutorial }: { tutorial?: TutorialInput }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const initialContentRef = useRef(toEditorContent(tutorial));
  const [title, setTitle] = useState(tutorial?.title ?? "");
  const [category, setCategory] = useState(tutorial?.category ?? "志愿服务");
  const [visibility, setVisibility] = useState(tutorial?.visibility === "PRIVATE" ? "ADMINS" : tutorial?.visibility ?? "ALL");
  const [content, setContent] = useState(initialContentRef.current);
  const [tags, setTags] = useState(tutorial?.tags ?? "");
  const [isPinned, setIsPinned] = useState(tutorial?.isPinned ?? false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [submitting, setSubmitting] = useState<"DRAFT" | "PUBLISHED" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [activeFormats, setActiveFormats] = useState(emptyFormatState);
  const [activeTextColor, setActiveTextColor] = useState<TutorialTextColor | null>(null);
  const allowNavigationRef = useRef(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const restoringHistoryRef = useRef(false);
  const pauseToolbarTrackingRef = useRef(false);

  const updateToolbarState = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    if (!editor || !selection?.rangeCount || !anchorNode || !editor.contains(anchorNode)) {
      setActiveFormats(emptyFormatState);
      setActiveTextColor(null);
      return;
    }

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough")
    });
    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement;
    const color = anchorElement?.closest<HTMLElement>("[data-tutorial-color]")?.dataset.tutorialColor;
    setActiveTextColor(color && color in tutorialTextColorMarkers ? color as TutorialTextColor : "default");
  }, []);

  const initialVisibility = tutorial?.visibility === "PRIVATE" ? "ADMINS" : tutorial?.visibility ?? "ALL";
  const hasUnsavedChanges = title !== (tutorial?.title ?? "")
    || category !== (tutorial?.category ?? "志愿服务")
    || visibility !== initialVisibility
    || content !== initialContentRef.current
    || tags !== (tutorial?.tags ?? "")
    || isPinned !== (tutorial?.isPinned ?? false)
    || Boolean(attachment)
    || removeAttachment;

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialContentRef.current) editorRef.current.innerHTML = initialContentRef.current;
  }, []);

  useEffect(() => {
    function handleSelectionChange() {
      if (!pauseToolbarTrackingRef.current) updateToolbarState();
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [updateToolbarState]);

  useEffect(() => {
    function requestNavigation(event: Event) {
      if (!hasUnsavedChanges || allowNavigationRef.current) return;
      event.preventDefault();
      const detail = (event as CustomEvent<{ continueNavigation?: () => void }>).detail;
      pendingNavigationRef.current = detail?.continueNavigation ?? (() => router.push("/admin/tutorials"));
      setExitPromptOpen(true);
    }

    function interceptPageLink(event: MouseEvent) {
      if (!hasUnsavedChanges || allowNavigationRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.hasAttribute("download") || target.target === "_blank") return;
      const url = new URL(target.href, window.location.href);
      if (url.href === window.location.href || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault();
      pendingNavigationRef.current = () => {
        if (url.origin === window.location.origin) router.push(`${url.pathname}${url.search}${url.hash}`);
        else window.location.assign(url.href);
      };
      setExitPromptOpen(true);
    }

    function interceptBrowserBack() {
      if (restoringHistoryRef.current) {
        restoringHistoryRef.current = false;
        return;
      }
      if (!hasUnsavedChanges || allowNavigationRef.current) return;
      restoringHistoryRef.current = true;
      window.history.forward();
      pendingNavigationRef.current = () => window.history.back();
      setExitPromptOpen(true);
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges || allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("app:request-navigation", requestNavigation);
    document.addEventListener("click", interceptPageLink, true);
    window.addEventListener("popstate", interceptBrowserBack);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      window.removeEventListener("app:request-navigation", requestNavigation);
      document.removeEventListener("click", interceptPageLink, true);
      window.removeEventListener("popstate", interceptBrowserBack);
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [hasUnsavedChanges, router]);

  async function save(status: "DRAFT" | "PUBLISHED", continueNavigation?: () => void) {
    const currentContent = editorRef.current?.innerHTML.trim() ?? content;
    setContent(currentContent);
    if (!title.trim()) {
      setFeedback("请填写教程标题");
      return false;
    }
    if (!category.trim()) {
      setFeedback("请填写教程分类");
      return false;
    }
    if (status === "PUBLISHED" && editorIsEmpty(editorRef.current)) {
      setFeedback("发布前请填写教程内容");
      return false;
    }

    setSubmitting(status);
    setFeedback("");
    const form = new FormData();
    form.set("title", title);
    form.set("category", category);
    form.set("visibility", visibility);
    form.set("content", currentContent);
    form.set("tags", tags);
    form.set("isPinned", String(isPinned));
    form.set("status", status);
    form.set("removeAttachment", String(removeAttachment));
    if (attachment) form.set("attachment", attachment);

    try {
      const response = await fetch(tutorial ? `/api/tutorials/${tutorial.id}` : "/api/tutorials", {
        method: tutorial ? "PATCH" : "POST",
        body: form
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setFeedback(result.message || "教程保存失败，请重试");
        return false;
      }
      allowNavigationRef.current = true;
      setExitPromptOpen(false);
      pendingNavigationRef.current = null;
      if (continueNavigation) continueNavigation();
      else {
        router.push("/admin/tutorials");
        router.refresh();
      }
      return true;
    } catch {
      setFeedback("网络异常，教程未保存");
      return false;
    } finally {
      setSubmitting(null);
    }
  }

  function leaveWithoutSaving() {
    const continueNavigation = pendingNavigationRef.current ?? (() => router.push("/admin/tutorials"));
    allowNavigationRef.current = true;
    setExitPromptOpen(false);
    pendingNavigationRef.current = null;
    continueNavigation();
  }

  function cancelExit() {
    pendingNavigationRef.current = null;
    setExitPromptOpen(false);
  }

  function rememberSelection() {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection?.rangeCount || !editor) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) savedRangeRef.current = range.cloneRange();
  }

  function restoreSelection() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    if (savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer)) {
      selection?.addRange(savedRangeRef.current);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection?.addRange(range);
    savedRangeRef.current = range.cloneRange();
  }

  function syncEditorContent() {
    if (!editorRef.current) return;
    setContent(editorRef.current.innerHTML.trim());
    rememberSelection();
    updateToolbarState();
  }

  function format(command: string, value?: string) {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command, false, value);
    syncEditorContent();
  }

  function applyTextColor(token: TutorialTextColor) {
    const editor = editorRef.current;
    if (!editor) return;
    pauseToolbarTrackingRef.current = true;
    restoreSelection();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("foreColor", false, tutorialTextColorMarkers[token]);

    const marker = tutorialTextColorMarkers[token].toLowerCase();
    for (const font of editor.querySelectorAll<HTMLFontElement>("font[color]")) {
      if (font.getAttribute("color")?.toLowerCase() !== marker) continue;
      font.removeAttribute("color");
      const colorSpan = document.createElement("span");
      colorSpan.dataset.tutorialColor = token;
      while (font.firstChild) colorSpan.appendChild(font.firstChild);
      if (font.attributes.length) font.appendChild(colorSpan);
      else font.replaceWith(colorSpan);
      let parent = colorSpan.parentElement;
      while (parent?.matches("span[data-tutorial-color]") && parent.childNodes.length === 1) {
        const nextParent = parent.parentElement;
        parent.replaceWith(colorSpan);
        parent = nextParent;
      }
    }
    syncEditorContent();
    setActiveTextColor(token);
    window.requestAnimationFrame(() => { pauseToolbarTrackingRef.current = false; });
  }

  async function insertInlineImage(file: File) {
    setUploadingInlineImage(true);
    setFeedback("");
    const form = new FormData();
    form.set("image", file);
    try {
      const response = await fetch("/api/tutorial-images", { method: "POST", body: form });
      const result = (await response.json().catch(() => ({}))) as { data?: { id: string; fileName: string; url: string }; message?: string };
      if (!response.ok || !result.data) {
        setFeedback(result.message || "正文图片插入失败");
        return;
      }
      restoreSelection();
      const selection = window.getSelection();
      const editor = editorRef.current;
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (!editor || !selection || !range || !editor.contains(range.commonAncestorContainer)) {
        setFeedback("没有找到图片插入位置，请重新点击正文后再试");
        return;
      }
      const image = document.createElement("img");
      image.src = result.data.url;
      image.alt = result.data.fileName;
      image.title = result.data.fileName;
      image.dataset.imageId = result.data.id;
      range.deleteContents();
      range.insertNode(image);
      const lineBreak = document.createElement("br");
      range.setStartAfter(image);
      range.collapse(true);
      range.insertNode(lineBreak);
      range.setStartAfter(lineBreak);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      syncEditorContent();
    } catch {
      setFeedback("网络异常，正文图片没有插入");
    } finally {
      setUploadingInlineImage(false);
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = "";
    }
  }

  const currentAttachmentName = attachment?.name || (!removeAttachment ? tutorial?.attachmentFileName : null);
  const currentAttachmentSize = attachment?.size ?? (!removeAttachment ? tutorial?.attachmentFileSize : null);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="教程标题" wide>
            <input className={inputClass} maxLength={150} onChange={(event) => setTitle(event.target.value)} placeholder="请输入清晰、具体的教程标题" value={title} />
          </Field>
          <Field label="教程分类">
            <input className={inputClass} list="tutorial-categories" maxLength={50} onChange={(event) => setCategory(event.target.value)} value={category} />
            <datalist id="tutorial-categories"><option value="志愿服务" /><option value="系统操作" /><option value="活动流程" /><option value="资料规范" /></datalist>
          </Field>
          <Field label="可见范围">
            <select className={inputClass} onChange={(event) => setVisibility(event.target.value as typeof visibility)} value={visibility}>
              <option value="ALL">所有人可见</option><option value="VOLUNTEERS">仅志愿者可见</option><option value="ADMINS">仅管理员可见</option>
            </select>
          </Field>
          <Field group label="教程内容" wide>
            <div className="overflow-hidden rounded-[14px] border border-black/[0.12] bg-white shadow-[inset_0_1px_1px_rgba(0,0,0,.02)] focus-within:border-[#0071e3]/60 focus-within:ring-4 focus-within:ring-[#0071e3]/10">
              <div aria-label="教程正文格式工具" className="flex flex-wrap items-center gap-1 border-b border-black/[0.08] bg-black/[0.018] p-2" role="toolbar">
                <FormatButton active={activeFormats.bold} label="加粗" onClick={() => format("bold")}><Bold size={17} /></FormatButton>
                <FormatButton active={activeFormats.italic} label="斜体" onClick={() => format("italic")}><Italic size={17} /></FormatButton>
                <FormatButton active={activeFormats.underline} label="下划线" onClick={() => format("underline")}><Underline size={17} /></FormatButton>
                <FormatButton active={activeFormats.strikeThrough} label="删除线" onClick={() => format("strikeThrough")}><Strikethrough size={17} /></FormatButton>
                <span aria-hidden="true" className="mx-1 h-6 w-px bg-black/[0.1]" />
                <select aria-label="选择字体" className="h-10 min-w-[7.5rem] rounded-[9px] border border-black/[0.1] bg-white px-2 text-[13px] font-medium" defaultValue="" onChange={(event) => { if (event.target.value) format("fontName", event.target.value); event.target.value = ""; }} onMouseDown={rememberSelection}>
                  <option disabled value="">字体</option>
                  <option value="-apple-system, PingFang SC, Microsoft YaHei, sans-serif">默认字体</option>
                  <option value="Songti SC, SimSun, serif">宋体</option>
                  <option value="PingFang SC, Microsoft YaHei, sans-serif">黑体</option>
                  <option value="Kaiti SC, KaiTi, serif">楷体</option>
                  <option value="FangSong, STFangsong, serif">仿宋</option>
                </select>
                <select aria-label="选择字号" className="h-10 min-w-[6.25rem] rounded-[9px] border border-black/[0.1] bg-white px-2 text-[13px] font-medium" defaultValue="" onChange={(event) => { if (event.target.value) format("fontSize", event.target.value); event.target.value = ""; }} onMouseDown={rememberSelection}>
                  <option disabled value="">字号</option>
                  <option value="2">小号</option><option value="3">正文</option><option value="4">大号</option><option value="5">特大号</option><option value="6">标题号</option>
                </select>
                <div aria-label="选择文字颜色" className="flex flex-wrap items-center gap-0.5" role="group">
                  {tutorialTextColorOptions.map((option) => (
                    <button
                      aria-label={option.label}
                      aria-pressed={activeTextColor === option.token}
                      className={`grid size-10 shrink-0 place-items-center rounded-[9px] transition active:scale-[0.92] ${activeTextColor === option.token ? "bg-[#0071e3]/12 ring-2 ring-inset ring-[#0071e3]/55" : "hover:bg-black/[0.055]"}`}
                      key={option.token}
                      onClick={() => applyTextColor(option.token)}
                      onMouseDown={(event) => { event.preventDefault(); rememberSelection(); }}
                      title={option.label}
                      type="button"
                    >
                      <span className="size-5 rounded-full border border-black/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]" style={{ background: option.swatch }} />
                    </button>
                  ))}
                </div>
                <span aria-hidden="true" className="mx-1 h-6 w-px bg-black/[0.1]" />
                <button className="inline-flex min-h-10 items-center gap-2 rounded-[9px] px-3 text-[13px] font-semibold text-[#0066cc] transition hover:bg-[#0071e3]/10 active:scale-[0.96] disabled:opacity-45" disabled={uploadingInlineImage} onClick={() => { rememberSelection(); inlineImageInputRef.current?.click(); }} type="button">
                  {uploadingInlineImage ? <Loader2 className="animate-spin" size={17} /> : <ImagePlus size={17} />}{uploadingInlineImage ? "图片处理中" : "插入图片"}
                </button>
                <input accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void insertInlineImage(file); }} ref={inlineImageInputRef} type="file" />
              </div>
              <div
                aria-label="教程内容编辑区"
                className="min-h-80 px-4 py-3 text-[15px] font-normal leading-7 text-[#1d1d1f] outline-none [&:empty:before]:pointer-events-none [&:empty:before]:text-[#98989d] [&:empty:before]:content-[attr(data-placeholder)] [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-[#0071e3]/25 [&_blockquote]:pl-4 [&_h2]:my-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:my-3 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-4 [&_img]:h-auto [&_img]:max-h-[70vh] [&_img]:max-w-full [&_img]:rounded-[12px] [&_img]:border [&_img]:border-black/[0.08] [&_img]:shadow-soft [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
                contentEditable
                data-placeholder="按步骤填写教程内容；保存草稿时可以暂时留空"
                onBlur={syncEditorContent}
                onFocus={updateToolbarState}
                onInput={syncEditorContent}
                onKeyUp={rememberSelection}
                onMouseUp={rememberSelection}
                ref={editorRef}
                suppressContentEditableWarning
              />
            </div>
            <p className="text-xs font-normal leading-5 text-[#86868b]">默认文字会随深浅模式自动切换；强调色均适配黑白背景。正文图片单张最大 20MB，每篇最多 30 张。</p>
          </Field>
          <Field label="标签" wide>
            <input className={inputClass} maxLength={500} onChange={(event) => setTags(event.target.value)} placeholder="多个标签用逗号分隔，例如：新手,报名,时长" value={tags} />
          </Field>
        </div>
      </Card>

      <div className="grid content-start gap-5">
        <Card className="p-5">
          <div className="flex items-center gap-2"><Paperclip size={18} className="text-[#0066cc]" /><h2 className="font-semibold text-[#1d1d1f]">教程附件</h2></div>
          <p className="mt-2 text-xs leading-5 text-[#86868b]">可上传一个附件，最大 100MB；重新选择文件会替换原附件。</p>
          <input className="sr-only" onChange={(event) => { setAttachment(event.target.files?.[0] ?? null); setRemoveAttachment(false); }} ref={fileInputRef} type="file" />
          <button className="mt-4 flex min-h-24 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0071e3]/25 bg-[#0071e3]/[0.035] px-4 text-center transition hover:border-[#0071e3]/55 hover:bg-[#0071e3]/[0.07] active:scale-[0.99]" onClick={() => fileInputRef.current?.click()} type="button">
            <Upload size={21} className="text-[#0066cc]" /><span className="mt-2 text-sm font-semibold text-[#0066cc]">选择附件</span><span className="mt-1 text-xs text-[#86868b]">点击后从设备中选择文件</span>
          </button>
          {currentAttachmentName ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-black/[0.035] p-3">
              <FileText className="shrink-0 text-[#0066cc]" size={20} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#3a3a3c]">{currentAttachmentName}</p><p className="mt-0.5 text-xs text-[#86868b]">{formatFileSize(currentAttachmentSize)}</p></div>
              <button aria-label="移除附件" className="rounded-lg p-1.5 text-[#86868b] hover:bg-[#ff3b30]/10 hover:text-[#d70015]" onClick={() => { setAttachment(null); setRemoveAttachment(true); if (fileInputRef.current) fileInputRef.current.value = ""; }} type="button"><X size={17} /></button>
            </div>
          ) : null}
          {tutorial?.attachmentFileName && !removeAttachment && !attachment ? <a className="mt-3 inline-flex text-xs font-semibold text-[#0066cc] hover:underline" download href={`/api/tutorials/${tutorial.id}/attachment`}>下载当前附件</a> : null}
        </Card>

        <Card className="p-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 transition hover:bg-black/[0.035]">
            <input checked={isPinned} className="mt-0.5 size-4 accent-[#0071e3]" onChange={(event) => setIsPinned(event.target.checked)} type="checkbox" />
            <span><span className="block text-sm font-semibold text-[#3a3a3c]">置顶教程</span><span className="mt-1 block text-xs leading-5 text-[#86868b]">置顶后会优先显示在教程列表顶部。</span></span>
          </label>
          {feedback ? <p className="mt-4 rounded-xl bg-[#ff3b30]/10 px-3 py-2 text-sm text-[#d70015]" role="alert">{feedback}</p> : null}
          <div className="mt-5 grid gap-3">
            <Button className="gap-2" disabled={Boolean(submitting)} onClick={() => save("DRAFT")} variant="secondary">
              {submitting === "DRAFT" ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}保存草稿
            </Button>
            <Button className="gap-2" disabled={Boolean(submitting)} onClick={() => save("PUBLISHED")}>
              {submitting === "PUBLISHED" ? <Loader2 className="animate-spin" size={16} /> : <BookOpenCheck size={16} />}{tutorial?.status === "PUBLISHED" ? "更新并发布" : "发布教程"}
            </Button>
          </div>
        </Card>
      </div>
      {exitPromptOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/35 p-4 backdrop-blur-[3px]">
          <div aria-labelledby="tutorial-exit-title" aria-modal="true" className="apple-material w-full max-w-md rounded-[18px] border border-white/70 p-6 shadow-floating" role="dialog">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ff9f0a]/12 text-[#a05a00]"><AlertTriangle size={21} /></span>
              <div>
                <h2 className="text-lg font-semibold text-[#1d1d1f]" id="tutorial-exit-title">要保存为草稿吗？</h2>
                <p className="mt-2 text-sm leading-6 text-[#6e6e73]">当前教程还有未保存的内容。保存草稿后可以稍后继续编辑。</p>
              </div>
            </div>
            {feedback ? <p className="mt-4 rounded-xl bg-[#ff3b30]/10 px-3 py-2 text-sm text-[#d70015]" role="alert">{feedback}</p> : null}
            <div className="mt-6 grid gap-2.5 sm:grid-cols-[auto_1fr_1fr]">
              <Button disabled={Boolean(submitting)} onClick={cancelExit} variant="secondary">取消</Button>
              <Button className="text-[#d70015]" disabled={Boolean(submitting)} onClick={leaveWithoutSaving} variant="ghost">不保存</Button>
              <Button className="gap-2" disabled={Boolean(submitting)} onClick={() => save("DRAFT", pendingNavigationRef.current ?? undefined)}>
                {submitting === "DRAFT" ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}保存草稿
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-black/[0.12] bg-white px-3.5 text-sm text-[#1d1d1f] outline-none transition focus:border-[#0071e3]/60 focus:ring-4 focus:ring-[#0071e3]/10";

type TutorialTextColor = keyof typeof tutorialTextColorMarkers;

type FormatState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
};

const emptyFormatState: FormatState = { bold: false, italic: false, underline: false, strikeThrough: false };

const tutorialTextColorMarkers = {
  default: "#010101",
  blue: "#020202",
  green: "#030303",
  orange: "#040404",
  red: "#050505",
  purple: "#060606"
} as const;

const tutorialTextColorOptions: Array<{ token: TutorialTextColor; label: string; swatch: string }> = [
  { token: "default", label: "默认文字（随模式变化）", swatch: "linear-gradient(135deg, #1d1d1f 0 50%, #f5f5f7 50% 100%)" },
  { token: "blue", label: "强调蓝", swatch: "var(--tutorial-text-blue)" },
  { token: "green", label: "成功绿", swatch: "var(--tutorial-text-green)" },
  { token: "orange", label: "提醒橙", swatch: "var(--tutorial-text-orange)" },
  { token: "red", label: "警示红", swatch: "var(--tutorial-text-red)" },
  { token: "purple", label: "重点紫", swatch: "var(--tutorial-text-purple)" }
];

function Field({ label, children, wide = false, group = false }: { label: string; children: React.ReactNode; wide?: boolean; group?: boolean }) {
  const className = `grid gap-2 text-sm font-semibold text-[#3a3a3c] ${wide ? "sm:col-span-2" : ""}`;
  if (group) return <div className={className}><span>{label}</span>{children}</div>;
  return <label className={className}>{label}{children}</label>;
}

function FormatButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`grid size-10 shrink-0 place-items-center rounded-[9px] transition active:scale-[0.94] ${active ? "bg-[#0071e3]/12 text-[#0066cc] ring-2 ring-inset ring-[#0071e3]/45" : "text-[#515154] hover:bg-black/[0.055] hover:text-[#1d1d1f]"}`}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function toEditorContent(tutorial?: TutorialInput) {
  if (!tutorial?.content) return "";
  if (tutorial.contentFormat === "RICH_TEXT") return tutorial.content;
  return tutorial.content.split(/\r?\n/).map((line) => `<p>${escapeEditorHtml(line) || "<br>"}</p>`).join("");
}

function escapeEditorHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function editorIsEmpty(editor: HTMLDivElement | null) {
  if (!editor) return true;
  const text = editor.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
  return !text && !editor.querySelector("img[data-image-id]");
}

function formatFileSize(size?: number | null) {
  if (!size) return "大小未知";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
