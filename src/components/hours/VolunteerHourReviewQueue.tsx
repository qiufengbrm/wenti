/** 项目导读：志愿时长组件：围绕申报、证明和审核组织交互；小时数虽小，账一定要算明白。 */
"use client";
/* eslint-disable @next/next/no-img-element -- authenticated proof previews cannot use the public image optimizer */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export interface HourReviewItem {
  id: string;
  source: "direct" | "task";
  sourceLabel: string;
  detailHref: string;
  taskId?: string;
  signupId?: string;
  user: string;
  studentId: string;
  workContent: string;
  serviceTime: string;
  hours: number;
  proofFileName: string | null;
  proofPreviewKind: "pdf" | "image" | "video" | "office" | "none";
  proofCanPreview: boolean;
  notes: string | null;
  submittedAt: string;
}

export function VolunteerHourReviewQueue({ initialItems, title = "待审核申请" }: { initialItems: HourReviewItem[]; title?: string }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [message, setMessage] = useState("");
  const selectedItems = useMemo(() => items.filter((item) => selected.has(item.id)), [items, selected]);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  function toggle(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function sendReview(item: HourReviewItem, approved: boolean, rejectReason?: string) {
    const url = item.source === "task" ? `/api/tasks/${item.taskId}/review` : `/api/hour-applications/${item.id}/review`;
    const body = item.source === "task"
      ? { signupId: item.signupId, approved, rejectReason }
      : { approved, rejectReason };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    return { ok: response.ok, message: result.message };
  }

  async function review(id: string, approved: boolean) {
    if (pending) return;
    let rejectReason: string | undefined;
    if (!approved) {
      const value = window.prompt("请填写驳回原因，志愿者会在消息中看到：", "申请内容或证明材料需要补充");
      if (value === null) return;
      rejectReason = value.trim() || "申请内容或证明材料需要补充";
    }
    setPending(id);
    const item = items.find((candidate) => candidate.id === id);
    if (!item) {
      setPending(null);
      return;
    }
    const result = await sendReview(item, approved, rejectReason);
    setMessage(result.message || (result.ok ? "审核完成" : "审核失败"));
    if (result.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setSelected((current) => { const next = new Set(current); next.delete(id); return next; });
      router.refresh();
    }
    setPending(null);
  }

  async function approveBatch() {
    if (!selectedItems.length || pending) return;
    setPending("batch");
    setBatchConfirmOpen(false);
    const results = await Promise.all(selectedItems.map(async (item) => ({ item, result: await sendReview(item, true) })));
    const approvedIds = new Set(results.filter(({ result }) => result.ok).map(({ item }) => item.id));
    const failedCount = results.length - approvedIds.size;
    setItems((current) => current.filter((item) => !approvedIds.has(item.id)));
    setSelected((current) => new Set(Array.from(current).filter((id) => !approvedIds.has(id))));
    setMessage(failedCount ? `已通过 ${approvedIds.size} 条，另有 ${failedCount} 条处理失败，请重试` : `已批量通过 ${approvedIds.size} 条申请`);
    router.refresh();
    setPending(null);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-[#1d1d1f]">{title}</h2><p className="mt-1 text-sm text-[#6e6e73]">{items.length} 条待处理，已选择 {selectedItems.length} 条</p></div>
        {items.length ? <Button disabled={!selectedItems.length || Boolean(pending)} onClick={() => setBatchConfirmOpen(true)}>批量通过{selectedItems.length ? `（${selectedItems.length}）` : ""}</Button> : null}
      </div>
      {message ? <div className="rounded-[10px] bg-[#0071e3]/[0.07] px-4 py-3 text-sm text-[#0066cc]" role="status">{message}</div> : null}
      <Card className="overflow-hidden p-0">
        {items.length ? <>
          <div className="flex items-center gap-3 border-b border-black/[0.07] bg-black/[0.018] px-4 py-3 text-xs font-medium text-[#6e6e73]"><input aria-label="选择全部申请" checked={allSelected} className="size-4 rounded border-black/20" onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)))} type="checkbox" />选择全部当前申请</div>
          <div className="divide-y divide-black/[0.07]">{items.map((item) => (
            <div className="grid gap-4 px-4 py-4 lg:grid-cols-[24px_minmax(0,1fr)_auto] lg:items-center" key={item.id}>
              <input aria-label={`选择 ${item.user} 的申请`} checked={selected.has(item.id)} className="size-4 rounded border-black/20" onChange={() => toggle(item.id)} type="checkbox" />
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-semibold text-[#1d1d1f]">{item.user}</span><span className="text-xs text-[#86868b]">{item.studentId}</span><span className="rounded-[9px] bg-[#34c759]/12 px-3 py-1 text-base font-bold tracking-tight text-[#1f7a35] shadow-[inset_0_0_0_1px_rgba(52,199,89,.14)]">{item.hours} 小时</span><span className="rounded-full bg-[#0071e3]/[0.08] px-2 py-0.5 text-xs font-medium text-[#0066cc]">{item.sourceLabel}</span></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#3a3a3c]">{item.workContent}</p><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#86868b]"><span>{item.serviceTime}</span><ProofHoverPreview item={item} /><span>提交于 {item.submittedAt}</span></div></div>
              <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end"><Button className="whitespace-nowrap" href={item.detailHref} variant="secondary">详细页面</Button><Button className="whitespace-nowrap" disabled={Boolean(pending)} onClick={() => review(item.id, true)}>{pending === item.id ? "处理中..." : "通过"}</Button><Button className="whitespace-nowrap" disabled={Boolean(pending)} onClick={() => review(item.id, false)} variant="ghost">驳回</Button></div>
            </div>
          ))}</div>
        </> : <div className="px-6 py-12 text-center"><p className="text-sm font-medium text-[#515154]">暂无待审核申请</p><p className="mt-1.5 text-xs text-[#86868b]">志愿者提交新的时长申请后会显示在这里</p></div>}
      </Card>
      {batchConfirmOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4 backdrop-blur-[2px]"><div className="apple-material w-full max-w-md rounded-[16px] border border-white/70 p-6 shadow-floating" role="dialog" aria-modal="true" aria-label="确认批量通过"><h3 className="text-lg font-semibold text-[#1d1d1f]">确认批量通过？</h3><p className="mt-3 text-sm leading-6 text-[#515154]">即将通过选中的 {selectedItems.length} 条申请。通过后时长会立即计入志愿者记录，并逐一发送通知。</p><div className="mt-6 flex justify-end gap-3"><Button onClick={() => setBatchConfirmOpen(false)} variant="secondary">取消</Button><Button onClick={approveBatch}>确认批量通过</Button></div></div></div> : null}
    </div>
  );
}

function ProofHoverPreview({ item }: { item: HourReviewItem }) {
  const [layout, setLayout] = useState<{ height: number; left: number; top: number; width: number } | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const canPreview = item.proofCanPreview;

  useEffect(() => () => {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  function cancelHide() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }

  function show(event: React.MouseEvent<HTMLSpanElement>) {
    if (!canPreview || !window.matchMedia("(hover: hover)").matches) return;
    cancelHide();
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(520, window.innerWidth - 24);
    const height = Math.min(410, window.innerHeight - 24);
    let left = rect.right + 10;
    if (left + width > window.innerWidth - 12) left = rect.left - width - 10;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    const top = Math.max(12, Math.min(rect.top + rect.height / 2 - height / 2, window.innerHeight - height - 12));
    showTimer.current = window.setTimeout(() => setLayout({ height, left, top, width }), 280);
  }

  function scheduleHide() {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    showTimer.current = null;
    cancelHide();
    hideTimer.current = window.setTimeout(() => setLayout(null), 260);
  }

  if (!item.proofFileName) return <span>未附证明</span>;
  return (
    <span
      className={canPreview ? "cursor-zoom-in rounded-md px-1.5 py-0.5 text-[#0066cc] transition hover:bg-[#0071e3]/[0.08] hover:ring-2 hover:ring-[#0071e3]/15" : undefined}
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      title={canPreview ? "悬停预览证明材料" : "该格式仅支持下载"}
    >
      证明：{item.proofFileName}
      {layout && typeof document !== "undefined" ? createPortal(<ProofPreviewCard item={item} layout={layout} onEnter={cancelHide} onLeave={scheduleHide} />, document.body) : null}
    </span>
  );
}

function ProofPreviewCard({ item, layout, onEnter, onLeave }: { item: HourReviewItem; layout: { height: number; left: number; top: number; width: number }; onEnter: () => void; onLeave: () => void }) {
  const previewUrl = `/api/hour-proofs/${item.source}/${item.id}/preview`;
  return (
    <div className="fixed z-[70] flex overflow-hidden rounded-[14px] border border-black/[0.1] bg-white shadow-floating" onMouseEnter={onEnter} onMouseLeave={onLeave} style={layout}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center border-b border-slate-100 px-3"><span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{item.proofFileName}</span><span className="ml-2 text-[11px] text-slate-400">辅助证明预览</span></div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-100">
          {item.proofPreviewKind === "image" ? <img alt={`预览 ${item.proofFileName}`} className="h-full w-full object-contain" src={previewUrl} /> : null}
          {item.proofPreviewKind === "video" ? <video className="h-full w-full object-contain" controls muted playsInline poster={`/api/hour-proofs/${item.source}/${item.id}/poster`} preload="metadata" src={previewUrl} /> : null}
          {item.proofPreviewKind === "pdf" || item.proofPreviewKind === "office" ? <iframe className="h-full w-full border-0 bg-white" src={`${previewUrl}#page=1&toolbar=0&navpanes=0&view=FitH`} title={`${item.proofFileName} 证明预览`} /> : null}
        </div>
      </div>
    </div>
  );
}
