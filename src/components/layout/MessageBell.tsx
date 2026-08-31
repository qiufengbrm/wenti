/** 项目导读：全站布局组件：照看侧栏、顶栏、主题和导航反馈；路标清楚，用户才不用凭感觉回家。 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export function MessageBell({ href, initialUnreadCount }: { href: string; initialUnreadCount: number }) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    let active = true;

    async function syncUnreadCount() {
      const response = await fetch("/api/messages?mode=unread-count", {
        cache: "no-store"
      }).catch(() => null);

      if (!active || !response?.ok) {
        return;
      }

      const result = (await response.json().catch(() => null)) as { count?: number } | null;
      if (typeof result?.count === "number") {
        setUnreadCount(result.count);
      }
    }

    function handleMessagesRead(event: Event) {
      const detail = (event as CustomEvent<{ count?: number }>).detail;
      const count = detail?.count ?? 0;
      setUnreadCount((current) => Math.max(0, current - count));
    }

    function handleFocus() {
      void syncUnreadCount();
    }

    window.addEventListener("wenti:messages-read", handleMessagesRead);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    const intervalId = window.setInterval(syncUnreadCount, 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("wenti:messages-read", handleMessagesRead);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  return (
    <Link aria-label="我的消息" className="relative inline-flex size-11 items-center justify-center rounded-[10px] text-[#515154] transition-colors hover:bg-black/[0.055] hover:text-[#1d1d1f] sm:size-9" href={href} title="我的消息">
      <Bell size={18} />
      {unreadCount > 0 ? <UnreadBadge count={unreadCount} className="absolute -right-1 -top-1" /> : null}
    </Link>
  );
}

export function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3b30] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white/90 ${className}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
