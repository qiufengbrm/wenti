/** 项目导读：志愿时长组件：围绕申报、证明和审核组织交互；小时数虽小，账一定要算明白。 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function HourReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function review(approved: boolean) {
    let rejectReason: string | undefined;
    if (!approved) {
      const value = window.prompt("请填写驳回原因：", "申请内容或证明材料需要补充");
      if (value === null) return;
      rejectReason = value.trim() || "申请内容或证明材料需要补充";
    }
    setPending(true);
    const response = await fetch(`/api/hour-applications/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved, rejectReason }) });
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(result.message || "审核完成");
    if (response.ok) window.setTimeout(() => router.push("/admin/tasks/hours/review"), 600);
    else setPending(false);
  }
  return <div className="grid gap-3">{message ? <p className="rounded-[10px] bg-[#0071e3]/[0.07] px-4 py-3 text-sm text-[#0066cc]">{message}</p> : null}<div className="flex flex-wrap justify-end gap-3"><Button disabled={pending} href="/admin/tasks/hours/review" variant="secondary">返回列表</Button><Button disabled={pending} onClick={() => review(false)} variant="ghost">驳回</Button><Button disabled={pending} onClick={() => review(true)}>{pending ? "处理中..." : "通过并计入时长"}</Button></div></div>;
}
