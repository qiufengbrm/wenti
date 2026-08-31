/** 项目导读：全站悬浮公告：每次打开页面都重新露脸，用户关掉后本页安静，管理员换内容时再来敲门。 */
"use client";

import { TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FloatingAnnouncementData } from "@/lib/floating-announcement";

const refreshInterval = 30_000;
const announcementUpdateEvent = "wenti:floating-announcement";

export function FloatingAnnouncement() {
  const [announcement, setAnnouncement] = useState<FloatingAnnouncementData | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/site-announcement", { cache: "no-store" });
      if (!response.ok) return;
      const result = (await response.json()) as { data?: FloatingAnnouncementData };
      setAnnouncement(result.data?.enabled && result.data.content ? result.data : null);
    } catch {
      // 公告接口暂时够不着就别挡页面，维护提醒不能自己先把网站吓坏。
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), refreshInterval);
    function receiveUpdate(event: Event) {
      const data = (event as CustomEvent<FloatingAnnouncementData>).detail;
      setAnnouncement(data?.enabled && data.content ? data : null);
    }
    window.addEventListener(announcementUpdateEvent, receiveUpdate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(announcementUpdateEvent, receiveUpdate);
    };
  }, [refresh]);

  const version = announcement?.updatedAt ?? announcement?.content ?? null;
  if (!announcement || (version && dismissedVersion === version)) return null;

  return (
    <aside
      aria-label="全站临时公告"
      aria-live="assertive"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] mx-auto flex max-h-[40vh] max-w-3xl items-start gap-3 overflow-auto rounded-[16px] border border-amber-500/25 bg-[rgba(255,249,235,.96)] px-3 py-3 text-amber-950 shadow-floating backdrop-blur-xl sm:inset-x-6 sm:px-4 dark:border-amber-300/20 dark:bg-[rgba(43,35,19,.96)] dark:text-amber-50"
      role="alert"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200">
        <TriangleAlert aria-hidden="true" size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold tracking-[0.02em] text-amber-700 dark:text-amber-200">临时公告</p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] font-medium leading-6 tracking-[-0.005em]">{announcement.content}</p>
      </div>
      <button
        aria-label="关闭临时公告"
        className="-mr-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-amber-800 transition-[background-color,transform] duration-150 hover:bg-amber-500/12 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-200/10"
        onClick={() => version && setDismissedVersion(version)}
        type="button"
      >
        <X size={19} />
      </button>
    </aside>
  );
}
