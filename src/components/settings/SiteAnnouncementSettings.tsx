/** 项目导读：公告控制台：内容、总开关和预览摆在一起，维护前敲一下锣，维护后记得收摊。 */
"use client";

import { Check, LoaderCircle, Megaphone, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { FloatingAnnouncementData } from "@/lib/floating-announcement";

export function SiteAnnouncementSettings({ initialAnnouncement }: { initialAnnouncement: FloatingAnnouncementData }) {
  const [content, setContent] = useState(initialAnnouncement.content);
  const [enabled, setEnabled] = useState(initialAnnouncement.enabled);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [updatedAt, setUpdatedAt] = useState(initialAnnouncement.updatedAt);

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/site-announcement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, enabled })
      });
      const result = (await response.json()) as { data?: FloatingAnnouncementData; message?: string };
      if (!response.ok) {
        setFeedback({ kind: "error", message: result.message ?? "保存公告失败" });
        return;
      }
      if (result.data) {
        setContent(result.data.content);
        setEnabled(result.data.enabled);
        setUpdatedAt(result.data.updatedAt);
        window.dispatchEvent(new CustomEvent("wenti:floating-announcement", { detail: result.data }));
      }
      setFeedback({ kind: "success", message: result.message ?? "公告设置已保存" });
    } catch {
      setFeedback({ kind: "error", message: "网络开小差了，公告没有保存，请重试" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0071e3]/10 text-[#0066cc]"><Megaphone size={20} /></span>
            <div><h2 className="font-semibold text-[#1d1d1f]">全站悬浮公告</h2><p className="mt-1 text-[13px] leading-5 text-[#6e6e73]">开启后会显示在管理员端、志愿者端和登录页顶部。</p></div>
          </div>
          <button
            aria-checked={enabled}
            aria-label={enabled ? "关闭全站悬浮公告" : "开启全站悬浮公告"}
            className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/20 ${enabled ? "bg-[#34c759]" : "bg-black/20 dark:bg-white/25"}`}
            onClick={() => setEnabled((current) => !current)}
            role="switch"
            type="button"
          >
            <span className={`absolute top-1 size-6 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,.22)] transition-transform duration-200 ease-apple-out ${enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <label className="mt-6 grid gap-2 text-[13px] font-semibold text-[#3a3a3c]">
          公告内容
          <textarea
            className="min-h-36 resize-y rounded-[12px] border border-black/[0.12] bg-white px-3.5 py-3 text-[15px] font-normal leading-6 text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
            maxLength={500}
            onChange={(event) => setContent(event.target.value)}
            placeholder="例如：网站将在今晚 22:00 进行维护，请提前保存正在填写的内容。"
            value={content}
          />
        </label>
        <div className="mt-2 flex items-start justify-between gap-3 text-[12px] leading-5 text-[#86868b]"><p>用户可关闭本次提示；刷新或重新打开网页后，只要总开关仍开启，公告会再次出现。</p><span className="shrink-0 tabular-nums">{content.length}/500</span></div>

        {feedback ? <p className={`mt-4 flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] ${feedback.kind === "success" ? "bg-[#34c759]/10 text-[#197a31] dark:bg-[#30d158]/15 dark:text-[#7ee787]" : "bg-[#ff3b30]/10 text-[#c7231a] dark:bg-[#ff453a]/15 dark:text-[#ff8a84]"}`} role="status">{feedback.kind === "success" ? <Check size={16} /> : <TriangleAlert size={16} />}{feedback.message}</p> : null}

        <div className="mt-5 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-black/[0.07] pt-5 sm:flex-row sm:items-center">
          <p className="text-[12px] text-[#86868b]">{updatedAt ? `最近保存：${formatTime(updatedAt)}` : "尚未保存过公告设置"}</p>
          <Button className="w-full sm:w-auto" disabled={saving} onClick={save}>{saving ? <><LoaderCircle className="mr-2 animate-spin" size={16} />保存中...</> : "保存公告设置"}</Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-[#1d1d1f]">显示预览</h2><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${enabled ? "bg-[#34c759]/10 text-[#197a31]" : "bg-black/[0.05] text-[#6e6e73]"}`}>{enabled ? "保存后开启" : "保存后关闭"}</span></div>
        <div className="mt-4 rounded-[16px] border border-amber-500/25 bg-[#fff9eb] p-3.5 text-amber-950 dark:border-amber-300/20 dark:bg-[#2b2313] dark:text-amber-50">
          <div className="flex items-start gap-3"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700"><TriangleAlert size={18} /></span><div className="min-w-0"><p className="text-[12px] font-semibold tracking-[0.02em] text-amber-700">临时公告</p><p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] font-medium leading-6">{content.trim() || "公告内容会显示在这里。"}</p></div></div>
        </div>
        <div className="mt-5 rounded-[12px] bg-black/[0.025] p-4 text-[13px] leading-6 text-[#6e6e73]"><p className="font-semibold text-[#3a3a3c]">使用建议</p><p className="mt-1">写清维护开始时间、预计恢复时间，以及需要用户提前保存什么。公告是敲锣，不是写年终总结，短一点更容易看见。</p></div>
      </Card>
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
