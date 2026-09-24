/** 项目导读：账号重置密码按钮：二次确认后调用接口，并把处理结果明确反馈给超级管理员。 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AccountResetPasswordButton({
  id,
  name,
  username,
  disabled = false
}: {
  id: string;
  name: string;
  username: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function resetPassword() {
    if (pending) return;

    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/users/${id}/password`, { method: "PUT" });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setFeedback({ tone: "error", message: result.message || "重置密码失败" });
        return;
      }

      setFeedback({ tone: "success", message: result.message || "密码已重置" });
      router.refresh();
    } catch {
      setFeedback({ tone: "error", message: "网络异常，请重试" });
    } finally {
      setPending(false);
    }
  }

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setFeedback(null);
  }

  return (
    <>
      <button
        className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title={disabled ? "超级管理员密码请在个人设置中修改" : undefined}
        type="button"
      >
        重置密码
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <div aria-labelledby={`reset-password-${id}`} aria-modal="true" className="w-full max-w-md rounded-[20px] bg-white p-5 shadow-2xl sm:p-6" role="dialog">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-full bg-[#0071e3]/10 text-[#0066cc]"><KeyRound size={22} /></div>
              <button aria-label="关闭重置密码弹窗" className="grid size-8 place-items-center rounded-full text-[#86868b] hover:bg-black/[0.055]" disabled={pending} onClick={closeDialog} type="button"><X size={18} /></button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#1d1d1f]" id={`reset-password-${id}`}>重置“{name}”的密码</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
              用户名：{username}。确认后密码将重置为初始密码 <strong className="font-mono text-[#1d1d1f]">123456</strong>，该用户下次登录后应尽快修改密码。
            </p>
            {feedback ? (
              <p className={`mt-4 rounded-[10px] px-4 py-3 text-sm ${feedback.tone === "success" ? "bg-[#34c759]/10 text-[#248a3d]" : "bg-[#ff3b30]/[0.07] text-[#d70015]"}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.message}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button disabled={pending} onClick={closeDialog} variant="secondary">{feedback?.tone === "success" ? "关闭" : "取消"}</Button>
              {feedback?.tone !== "success" ? <Button disabled={pending} onClick={resetPassword}>{pending ? "重置中..." : "确认重置"}</Button> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
