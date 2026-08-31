/** 项目导读：志愿时长组件：围绕申报、证明和审核组织交互；小时数虽小，账一定要算明白。 */
"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

const maxFileSize = 20 * 1024 * 1024;
const baseExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip"];

export function ProofFilePicker({
  file,
  onChange,
  allowVideo = false,
  disabled = false
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  allowVideo?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const accept = `image/*,${allowVideo ? "video/*," : ""}${baseExtensions.join(",")}`;

  function chooseFile(next: File | null) {
    setError("");
    if (!next) {
      onChange(null);
      return;
    }
    if (next.size > maxFileSize) {
      setError("文件不能超过 20MB");
      return;
    }
    if (!supportsFile(next, allowVideo)) {
      setError(allowVideo ? "仅支持图片、视频、PDF、Office 文件和 ZIP" : "仅支持图片、PDF、Office 文件和 ZIP");
      return;
    }
    onChange(next);
  }

  function clearFile() {
    if (inputRef.current) inputRef.current.value = "";
    setError("");
    onChange(null);
  }

  function openPicker() {
    if (disabled) return;
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  }

  function dragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled || !hasFiles(event.dataTransfer)) return;
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function dragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled || !hasFiles(event.dataTransfer)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }

  function drop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (disabled) return;
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div>
      <div
        className={cn(
          "relative flex min-h-24 items-center gap-3 rounded-[14px] border-2 border-dashed border-black/[0.13] bg-black/[0.018] p-3 transition-[background-color,border-color,box-shadow,transform] duration-150",
          !disabled && "cursor-pointer hover:border-[#0071e3]/30 hover:bg-[#0071e3]/[0.035]",
          dragActive && "scale-[1.01] border-[#0071e3] bg-[#0071e3]/10 shadow-[0_0_0_4px_rgba(0,113,227,.12)]",
          disabled && "cursor-not-allowed opacity-55"
        )}
        onClick={openPicker}
        onDragEnter={dragEnter}
        onDragLeave={dragLeave}
        onDragOver={(event) => { if (hasFiles(event.dataTransfer)) { event.preventDefault(); event.dataTransfer.dropEffect = disabled ? "none" : "copy"; } }}
        onDrop={drop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPicker(); } }}
      >
        <input
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#0066cc] shadow-sm transition-colors", dragActive && "bg-[#0071e3] text-white")}>
          {file && !dragActive ? <CheckCircle2 size={21} /> : <FileUp size={21} />}
        </span>
        <span className="min-w-0 flex-1 font-normal">
          <span className={cn("block text-sm font-semibold text-[#3a3a3c]", dragActive && "text-[#0066cc]")}>{dragActive ? "松开即可上传" : file ? file.name : "拖拽证明材料到这里"}</span>
          <span className="mt-1 block text-xs text-[#86868b]">{file ? formatFileSize(file.size) : "也可以点击此区域选择文件"}</span>
        </span>
        {file && !disabled ? <button aria-label="移除已选择的文件" className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#86868b] transition-colors hover:bg-black/[0.06] hover:text-[#3a3a3c] active:bg-black/[0.1]" onClick={(event) => { event.stopPropagation(); clearFile(); }} type="button"><X size={15} /></button> : null}
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-[#d70015]" role="alert">{error}</p> : null}
    </div>
  );
}

function supportsFile(file: File, allowVideo: boolean) {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/") || (allowVideo && type.startsWith("video/"))) return true;
  const name = file.name.toLowerCase();
  return baseExtensions.some((extension) => name.endsWith(extension));
}

function hasFiles(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes("Files");
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
