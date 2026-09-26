/** 项目导读：全站统一的手机版“发送文件”按钮；桌面端不渲染可见入口。 */
"use client";

import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { type FileShareRequest, useFileShare } from "@/hooks/useFileShare";

export function MobileFileShareButton({
  url,
  fileName,
  request,
  cacheKey,
  onDownloadFallback,
  className,
  label = "发送文件",
  iconOnly = false,
  variant = "secondary"
}: {
  url: string;
  fileName?: string;
  request?: FileShareRequest;
  cacheKey?: string;
  onDownloadFallback?: () => void;
  className?: string;
  label?: string;
  iconOnly?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const { share, busy, ready, message, state } = useFileShare({
    url,
    fileName,
    request,
    cacheKey,
    onDownloadFallback
  });
  const visibleLabel = busy ? "正在准备…" : ready && message.includes("再次") ? "再次点击发送" : label;

  return (
    <>
      <Button
        className={cn("gap-2 sm:hidden", iconOnly && "min-h-0 w-11 rounded-none px-0 ring-0", className)}
        disabled={busy}
        onClick={share}
        variant={variant}
      >
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        {iconOnly ? <span className="sr-only">{visibleLabel}</span> : visibleLabel}
      </Button>
      {message ? <p className={cn("fixed inset-x-4 bottom-5 z-[100] rounded-xl px-4 py-3 text-center text-sm font-medium shadow-floating sm:hidden", state === "error" ? "bg-[#d70015] text-white" : "bg-[#1d1d1f] text-white")} role={state === "error" ? "alert" : "status"}>{message}</p> : null}
    </>
  );
}
