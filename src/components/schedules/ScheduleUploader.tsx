/** 项目导读：课表组件：把课程和空闲时间变成看得懂的界面；红黄绿各司其职，不在这里表演交通灯蹦迪。 */
"use client";

import { DragEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ScheduleUploader({ hasSchedule }: { hasSchedule: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    if (!/\.xlsx?$/i.test(nextFile.name)) {
      setMessage({ type: "error", text: "请选择学校导出的 .xls 或 .xlsx 课表" });
      setFile(null);
      return;
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "课表文件不能超过 5MB" });
      setFile(null);
      return;
    }
    setFile(nextFile);
    setMessage(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/schedules", { method: "POST", body: formData });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "课表录入失败");
      setMessage({ type: "success", text: result.message || "课表录入成功" });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "课表录入失败" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="rounded-[10px] bg-[#34c759]/10 p-2.5 text-[#248a3d]"><FileSpreadsheet size={20} /></div>
            <div>
              <h2 className="font-semibold text-slate-950">{hasSchedule ? "更新课表" : "录入课表"}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">直接上传学校系统导出的文件，系统会自动识别课程、时段和周次。重新上传会替换当前课表。</p>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-[430px]">
          <div
            className={`flex min-h-28 cursor-pointer items-center justify-center rounded-[12px] border-2 border-dashed px-4 text-center transition-[border-color,background-color,transform] duration-150 ${dragging ? "border-[#0071e3] bg-[#0071e3]/10" : "border-black/15 bg-black/[0.018] hover:border-[#0071e3]/55 hover:bg-[#0071e3]/[0.045]"}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
          >
            <input accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} ref={inputRef} type="file" />
            <div>
              <UploadCloud className="mx-auto text-[#0071e3]" size={25} />
              <p className="mt-2 text-sm font-semibold text-slate-800">{file ? file.name : "拖拽课表到这里，或点击选择"}</p>
              <p className="mt-1 text-xs text-slate-500">支持 .xls、.xlsx，最大 5MB</p>
            </div>
          </div>
          {message ? <div className={`mt-3 flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm ${message.type === "success" ? "bg-[#34c759]/10 text-[#248a3d]" : "bg-[#ff3b30]/10 text-[#d70015]"}`} role={message.type === "error" ? "alert" : "status"}>{message.type === "success" ? <CheckCircle2 size={16} /> : null}{message.text}</div> : null}
          <Button className="mt-3 w-full" disabled={!file || uploading} onClick={upload}>{uploading ? <><Loader2 className="mr-2 animate-spin" size={16} />正在解析课表</> : hasSchedule ? "上传并替换课表" : "上传并录入课表"}</Button>
        </div>
      </div>
    </Card>
  );
}
