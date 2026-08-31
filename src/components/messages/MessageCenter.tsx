/** 项目导读：消息中心组件：负责列表、未读状态和一键已读；消息可以多，红点不能世袭。 */
"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, ClipboardList, Inbox, Shield } from "lucide-react";
import { UnreadBadge } from "@/components/layout/MessageBell";
import type { MessageCenterCategory, MessageCenterThread } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/role";

const volunteerCategoryMeta: Array<{
  key: MessageCenterCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { key: "tasks", label: "任务消息", icon: ClipboardList },
  { key: "system", label: "系统消息", icon: Shield }
];

const adminCategoryMeta: typeof volunteerCategoryMeta = [
  { key: "tasks", label: "任务消息", icon: ClipboardList },
  { key: "system", label: "系统消息", icon: Shield }
];

export function MessageCenter({ initialThreads, role }: { initialThreads: MessageCenterThread[]; role: Role }) {
  const [threads, setThreads] = useState(initialThreads);
  const [activeCategory, setActiveCategory] = useState<MessageCenterCategory>("tasks");
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [feedback, setFeedback] = useState("");
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const categoryMeta = role === "volunteer" ? volunteerCategoryMeta : adminCategoryMeta;

  const activeThreads = useMemo(() => threads.filter((thread) => thread.category === activeCategory), [threads, activeCategory]);
  const activeThread = activeThreads.find((thread) => thread.id === activeThreadId) ?? null;
  const totalUnreadCount = useMemo(() => threads.reduce((sum, thread) => sum + thread.unreadCount, 0), [threads]);

  useLayoutEffect(() => {
    const container = detailScrollRef.current;
    if (!container || !activeThreadId) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [activeThreadId]);

  async function handleCategoryChange(category: MessageCenterCategory) {
    setActiveCategory(category);
    setActiveThreadId(null);
  }

  async function handleThreadSelect(thread: MessageCenterThread) {
    setActiveThreadId(thread.id);
    const readCount = thread.unreadCount;

    if (thread.unreadCount <= 0) {
      return;
    }

    setThreads((current) =>
      current.map((item) =>
        item.id === thread.id
          ? {
              ...item,
              unreadCount: 0,
              items: item.items.map((message) => ({ ...message, status: "已读" }))
            }
          : item
      )
    );
    window.dispatchEvent(new CustomEvent("wenti:messages-read", { detail: { count: readCount } }));

    await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: thread.category,
        peerId: thread.peerId
      })
    }).catch(() => undefined);
  }

  async function handleMarkAllRead() {
    if (markingAllRead || totalUnreadCount <= 0) return;
    setMarkingAllRead(true);
    setFeedback("");

    try {
      const response = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true })
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setFeedback(result.message || "标记已读失败，请稍后重试");
        return;
      }

      const readCount = totalUnreadCount;
      setThreads((current) => current.map((thread) => ({
        ...thread,
        unreadCount: 0,
        items: thread.items.map((message) => ({ ...message, status: "已读" }))
      })));
      window.dispatchEvent(new CustomEvent("wenti:messages-read", { detail: { count: readCount } }));
      setFeedback("所有消息已标记为已读");
    } catch {
      setFeedback("网络异常，请稍后重试");
    } finally {
      setMarkingAllRead(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[14px] border border-black/[0.08] bg-white/90 shadow-soft">
      <div className="flex min-h-[680px] flex-col lg:h-[680px] lg:flex-row">
        <aside className="shrink-0 border-b border-black/[0.07] bg-black/[0.025] lg:w-56 lg:border-b-0 lg:border-r">
          <div className="flex h-14 items-center gap-3 border-b border-black/[0.07] px-4 lg:h-16 lg:px-5">
            <Inbox className="text-[#0071e3]" size={19} />
            <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-[#1d1d1f]">消息中心</h2>
          </div>
          <nav className="grid grid-cols-2 gap-1 overflow-x-auto p-2.5 lg:grid-cols-1 lg:p-3">
            {categoryMeta.map((category) => {
              const Icon = category.icon;
              const unreadCount = threads.filter((thread) => thread.category === category.key).reduce((sum, thread) => sum + thread.unreadCount, 0);
              const active = activeCategory === category.key;

              return (
                <button
                  className={cn(
                    "flex h-11 min-w-0 items-center justify-between rounded-[10px] px-2.5 text-left text-[12px] font-medium transition-colors lg:h-12 lg:px-3 lg:text-[13px]",
                    active ? "bg-[#0071e3]/10 font-semibold text-[#0066cc]" : "text-[#6e6e73] hover:bg-white/80 hover:text-[#1d1d1f]"
                  )}
                  key={category.key}
                  onClick={() => handleCategoryChange(category.key)}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={17} />
                    {category.label}
                  </span>
                  {unreadCount > 0 ? <UnreadBadge count={unreadCount} /> : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <aside className="w-full shrink-0 border-b border-black/[0.07] bg-white lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex h-14 items-center justify-between gap-3 border-b border-black/[0.07] px-4 lg:h-16 lg:px-5">
            <div>
              <p className="text-sm text-slate-500">最近消息</p>
              <p className="mt-1 text-xs text-slate-400">{categoryMeta.find((item) => item.key === activeCategory)?.label}</p>
            </div>
            <button
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-xs font-semibold text-[#0066cc] transition-[background-color,color,transform] hover:bg-[#0071e3]/10 active:scale-[0.96] disabled:cursor-default disabled:text-[#aeaeb2] disabled:hover:bg-transparent"
              disabled={markingAllRead || totalUnreadCount <= 0}
              onClick={handleMarkAllRead}
              type="button"
            >
              <CheckCheck size={15} />{markingAllRead ? "处理中" : "全部已读"}
            </button>
          </div>
          {feedback ? <p aria-live="polite" className={cn("border-b border-black/[0.055] px-4 py-2 text-xs lg:px-5", feedback.includes("失败") || feedback.includes("异常") ? "bg-[#ff3b30]/[0.06] text-[#d70015]" : "bg-[#34c759]/[0.07] text-[#248a3d]")}>{feedback}</p> : null}
          <div className="max-h-64 overflow-auto lg:h-[calc(100%-4rem)] lg:max-h-none">
            {activeThreads.length > 0 ? (
              activeThreads.map((thread) => (
                <button
                  className={cn(
                    "grid w-full grid-cols-[40px_1fr_auto] gap-3 border-b border-black/[0.055] px-4 py-3.5 text-left transition-colors hover:bg-black/[0.025] lg:grid-cols-[44px_1fr_auto] lg:px-5 lg:py-4",
                    activeThreadId === thread.id ? "bg-[#0071e3]/[0.065]" : "bg-white"
                  )}
                  key={thread.id}
                  onClick={() => handleThreadSelect(thread)}
                  type="button"
                >
                  <Avatar name={thread.peerName} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-950">{thread.peerName}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{thread.preview}</span>
                    <span className="mt-1 block truncate text-xs text-slate-400">{thread.peerSubline}</span>
                  </span>
                  {thread.unreadCount > 0 ? <UnreadBadge count={thread.unreadCount} className="mt-1" /> : null}
                </button>
              ))
            ) : (
              <div className="px-5 py-12 text-center text-sm text-slate-500">当前分类暂无消息</div>
            )}
          </div>
        </aside>

        <main className="min-h-[440px] min-w-0 flex-1 bg-[#f5f5f7]">
          <div className="flex h-14 items-center justify-between border-b border-black/[0.07] bg-white/80 px-4 lg:h-16 lg:px-6">
            <h3 className="text-base font-semibold text-slate-950">{activeThread?.peerName ?? "请选择一条消息"}</h3>
            <span className="text-sm text-slate-400">{activeThread ? `${activeThread.items.length} 条记录` : "不会自动打开详情"}</span>
          </div>
          {activeThread ? (
            <div className="h-[calc(100%-3.5rem)] overflow-auto px-4 py-6 sm:px-6 lg:h-[calc(100%-4rem)] lg:px-8 lg:py-8" ref={detailScrollRef}>
              <div className="mx-auto grid max-w-3xl gap-5">
                {activeThread.items.map((message) => (
                  <div className="grid gap-3" key={`${message.source}:${message.id}`}>
                    <div className="flex justify-center">
                      <time className="rounded-full bg-slate-200/80 px-3 py-1 text-xs text-slate-500">{message.date}</time>
                    </div>
                    <article className={cn("flex gap-3", message.direction === "sent" ? "justify-end" : "justify-start")}>
                      {message.direction === "received" ? <Avatar name={activeThread.peerName} compact /> : null}
                      <div className={cn("max-w-[86%] rounded-[14px] px-4 py-3.5 shadow-sm sm:max-w-[76%] sm:px-5 sm:py-4", message.direction === "sent" ? "bg-[#0071e3] text-white" : "bg-white text-[#3a3a3c]")}>
                        <h4 className="mb-3 border-b border-current/10 pb-2 text-sm font-semibold">{message.title}</h4>
                        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        {message.relatedUrl !== "#" ? (
                          <a className={cn("mt-3 inline-flex text-xs font-medium", message.direction === "sent" ? "text-blue-50" : "text-blue-700")} href={message.relatedUrl}>
                            查看相关页面
                          </a>
                        ) : null}
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[calc(100%-4rem)] items-center justify-center px-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                  <Inbox size={22} />
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900">选择左侧列表中的消息</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">进入消息中心时不会自动打开详情；点击具体用户后，会显示详情并清除对应未读提示。</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

function Avatar({ name, compact = false }: { name: string; compact?: boolean }) {
  const initial = name.slice(0, 1);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[#0071e3] font-semibold text-white",
        compact ? "h-9 w-9 text-sm" : "h-11 w-11 text-base"
      )}
    >
      {initial}
    </span>
  );
}
