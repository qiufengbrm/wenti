/** 项目导读：志愿时长组件：围绕申报、证明和审核组织交互；小时数虽小，账一定要算明白。 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { ProofFilePicker } from "@/components/hours/ProofFilePicker";

export function VolunteerHourApplicationForm() {
  const router = useRouter();
  const [workContent, setWorkContent] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [hours, setHours] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!serviceDate) {
      setMessage("请选择志愿服务日期");
      return;
    }
    if (proof && proof.size > 20 * 1024 * 1024) {
      setMessage("辅助证明材料不能超过 20MB");
      return;
    }
    setSubmitting(true);
    setMessage("正在提交申请...");
    const form = new FormData();
    form.append("workContent", workContent);
    form.append("serviceDate", serviceDate);
    form.append("hours", hours);
    form.append("notes", notes);
    if (proof) form.append("proof", proof);
    const response = await fetch("/api/hour-applications", { method: "POST", body: form });
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setMessage(result.message || "申请提交失败");
      setSubmitting(false);
      return;
    }
    setMessage(result.message || "申请已提交");
    window.setTimeout(() => router.push("/volunteer/hours"), 700);
  }

  return (
    <Card className="mx-auto max-w-3xl p-5 sm:p-7">
      <form className="grid gap-5" onSubmit={submit}>
        <label className="grid gap-2 text-sm font-medium text-[#3a3a3c]">
          志愿服务内容
          <textarea className={textareaClass} maxLength={2000} onChange={(event) => setWorkContent(event.target.value)} placeholder="说明参加了什么志愿服务、承担了哪些工作" required value={workContent} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 text-sm font-medium text-[#3a3a3c] sm:col-span-2"><span>日期</span><DatePicker ariaLabel="选择志愿服务日期" className="max-w-sm" onChange={setServiceDate} required value={serviceDate} /></div>
        </div>
        <label className="grid gap-2 text-sm font-medium text-[#3a3a3c]">
          申请志愿时长
          <div className="relative max-w-xs"><input className={`${inputClass} w-full pr-12`} min={0.5} onChange={(event) => setHours(event.target.value)} required step={0.5} type="number" value={hours} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#86868b]">小时</span></div>
          <span className="text-xs font-normal text-[#86868b]">以 0.5 小时为最小单位</span>
        </label>
        <div className="grid gap-2 text-sm font-medium text-[#3a3a3c]">
          <span>辅助证明材料</span>
          <ProofFilePicker file={proof} onChange={setProof} />
          <span className="text-xs font-normal text-[#86868b]">支持图片、PDF、Office 文件和 ZIP，最大 20MB</span>
        </div>
        <label className="grid gap-2 text-sm font-medium text-[#3a3a3c]">
          备注
          <textarea className={textareaClass} maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder="可补充服务地点、组织人、证明材料说明等信息" value={notes} />
        </label>
        {message ? <p className="rounded-[10px] bg-[#0071e3]/[0.06] px-4 py-3 text-sm text-[#0066cc]" role="status">{message}</p> : null}
        <div className="flex flex-wrap justify-end gap-3"><Button disabled={submitting} href="/volunteer/tasks" variant="secondary">取消</Button><Button className="min-w-32" disabled={submitting} type="submit">{submitting ? "正在提交..." : "提交申请"}</Button></div>
      </form>
    </Card>
  );
}

const inputClass = "h-11 rounded-[10px] border border-black/[0.13] bg-white px-3 text-sm outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10";
const textareaClass = "min-h-28 rounded-[10px] border border-black/[0.13] bg-white p-3 text-sm leading-6 outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10";
