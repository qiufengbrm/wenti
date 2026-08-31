/** 项目导读：志愿时长组件：围绕申报、证明和审核组织交互；小时数虽小，账一定要算明白。 */
"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type RecordType = "direct" | "taskSubmission" | "taskHour";

export function RejectApprovedHourButton({ recordId, recordType, activityName, hours }: {
  recordId: string;
  recordType: RecordType;
  activityName: string;
  hours: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleReject() {
    const rejectReason = reason.trim();
    if (!rejectReason) {
      setError("请填写驳回原因");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/hours/${recordId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordType, rejectReason })
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "驳回失败，请稍后重试");

      setOpen(false);
      setReason("");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "驳回失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>驳回已通过</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" aria-labelledby="reject-approved-hour-title" className="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-rose-50 p-2.5 text-rose-600"><AlertTriangle className="h-5 w-5" /></div>
                <div>
                  <h2 id="reject-approved-hour-title" className="text-lg font-bold text-slate-950">驳回已通过的志愿时长</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">“{activityName}”的 {hours} 小时将从该志愿者的累计时长中扣除。</p>
                </div>
              </div>
              <button type="button" aria-label="关闭" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setOpen(false)} disabled={submitting}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              驳回后将删除该申请的辅助证明附件，并向志愿者发送通知。{recordType === "taskSubmission" ? "志愿者可以修改后重新提交任务时长。" : ""}
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor={`reject-reason-${recordId}`}>驳回原因 <span className="text-rose-500">*</span></label>
            <textarea
              id={`reject-reason-${recordId}`}
              value={reason}
              maxLength={1000}
              rows={4}
              autoFocus
              placeholder="请说明需要驳回的原因，志愿者会在消息中看到"
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              onChange={(event) => { setReason(event.target.value); if (error) setError(""); }}
              disabled={submitting}
            />
            <div className="mt-1 flex min-h-5 items-center justify-between gap-3 text-xs"><span className="text-rose-600">{error}</span><span className="text-slate-400">{reason.length}/1000</span></div>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>取消</Button>
              <Button type="button" variant="danger" onClick={handleReject} disabled={submitting || !reason.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}确认驳回
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
