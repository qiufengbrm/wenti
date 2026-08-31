/** 项目导读：账号管理组件：创建或删除账号时把权限与关联数据说明白，删人不是按一下就当无事发生。 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Impact = {
  id: string;
  name: string;
  username: string;
  personal: { profile: number; signups: number; submissions: number; hours: number; messages: number; noticeReads: number; uploadedFiles: number };
  shared: { tasks: number; notices: number; tutorials: number; taskTypes: number; folders: number; projects: number };
};

export function AccountDeleteButton({ id, name, username, disabled = false }: { id: string; name: string; username: string; disabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [mode, setMode] = useState<"preserve" | "purge">("preserve");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function openDialog() {
    if (disabled) return;
    setOpen(true);
    setImpact(null);
    setMode("preserve");
    setConfirmation("");
    setError("");
    const response = await fetch(`/api/users/${id}`, { cache: "no-store" });
    const result = (await response.json().catch(() => ({}))) as { data?: Impact; message?: string };
    if (!response.ok || !result.data) setError(result.message || "无法读取账号关联信息");
    else setImpact(result.data);
  }

  async function deleteAccount() {
    if (pending || !impact || (mode === "purge" && confirmation !== username)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteRelatedData: mode === "purge", confirmUsername: confirmation })
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(result.message || "删除账号失败");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("网络异常，请重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button className="h-8 rounded-md border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} onClick={openDialog} type="button">删除</button>
      {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
        <div aria-labelledby={`delete-account-${id}`} aria-modal="true" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[20px] bg-white p-5 shadow-2xl sm:p-6" role="dialog">
          <div className="flex items-start justify-between gap-4"><div className="grid size-11 place-items-center rounded-full bg-[#ff3b30]/10 text-[#d70015]"><AlertTriangle size={22} /></div><button aria-label="关闭删除账号弹窗" className="grid size-8 place-items-center rounded-full text-[#86868b] hover:bg-black/[0.055]" disabled={pending} onClick={() => setOpen(false)} type="button"><X size={18} /></button></div>
          <h2 className="mt-4 text-lg font-semibold text-[#1d1d1f]" id={`delete-account-${id}`}>删除账号“{name}”</h2>
          <p className="mt-1 text-sm text-[#6e6e73]">用户名：{username}</p>

          {!impact && !error ? <div className="mt-6 rounded-[12px] bg-black/[0.025] px-4 py-5 text-center text-sm text-[#6e6e73]">正在核对关联信息...</div> : null}
          {impact ? <>
            <div className="mt-5 grid gap-3">
              <DeletionChoice checked={mode === "preserve"} description="账号将无法登录并从账号列表隐藏；历史任务、志愿时长、消息和资料继续保留。" icon={<ShieldCheck size={19} />} label="仅删除登录账号，保留关联信息（推荐）" onClick={() => { setMode("preserve"); setConfirmation(""); }} />
              <DeletionChoice checked={mode === "purge"} danger description="个人报名、任务提交、志愿时长、消息、证明附件和本人上传文件将永久删除。共享业务内容会转交当前超级管理员。" icon={<Trash2 size={19} />} label="永久删除账号及个人关联信息" onClick={() => setMode("purge")} />
            </div>

            <div className="mt-5 rounded-[12px] border border-black/[0.07] bg-black/[0.018] p-4">
              <p className="text-xs font-semibold text-[#515154]">当前关联数据</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[#6e6e73] sm:grid-cols-3">
                <Impact label="任务报名" value={impact.personal.signups} /><Impact label="任务提交" value={impact.personal.submissions} /><Impact label="志愿时长" value={impact.personal.hours} /><Impact label="收发消息" value={impact.personal.messages} /><Impact label="上传文件" value={impact.personal.uploadedFiles} />
              </div>
              {Object.values(impact.shared).some(Boolean) ? <p className="mt-3 border-t border-black/[0.06] pt-3 text-xs leading-5 text-[#86868b]">该账号还负责 {sumValues(impact.shared)} 项共享业务内容。永久删除时这些内容不会被误删，将转交当前超级管理员。</p> : null}
            </div>

            {mode === "purge" ? <label className="mt-5 grid gap-2 text-sm font-medium text-[#3a3a3c]">输入用户名 <span className="font-mono text-[#d70015]">{username}</span> 确认永久删除<input autoComplete="off" className="h-11 rounded-[10px] border border-[#ff3b30]/30 px-3 font-mono text-sm outline-none focus:border-[#ff3b30] focus:ring-4 focus:ring-[#ff3b30]/10" onChange={(event) => setConfirmation(event.target.value)} placeholder={username} value={confirmation} /></label> : null}
          </> : null}
          {error ? <p className="mt-4 rounded-[10px] bg-[#ff3b30]/[0.07] px-4 py-3 text-sm text-[#d70015]" role="alert">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-3"><Button disabled={pending} onClick={() => setOpen(false)} variant="secondary">取消</Button><Button disabled={pending || !impact || (mode === "purge" && confirmation !== username)} onClick={deleteAccount} variant="danger">{pending ? "删除中..." : mode === "purge" ? "永久删除" : "删除账号并保留信息"}</Button></div>
        </div>
      </div> : null}
    </>
  );
}

function DeletionChoice({ checked, danger = false, description, icon, label, onClick }: { checked: boolean; danger?: boolean; description: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button aria-pressed={checked} className={`flex w-full items-start gap-3 rounded-[14px] border p-4 text-left transition ${checked ? danger ? "border-[#ff3b30]/40 bg-[#ff3b30]/[0.055] ring-4 ring-[#ff3b30]/[0.06]" : "border-[#0071e3]/35 bg-[#0071e3]/[0.045] ring-4 ring-[#0071e3]/[0.05]" : "border-black/[0.09] hover:bg-black/[0.02]"}`} onClick={onClick} type="button"><span className={`mt-0.5 ${danger ? "text-[#d70015]" : "text-[#0066cc]"}`}>{icon}</span><span><span className="block text-sm font-semibold text-[#1d1d1f]">{label}</span><span className="mt-1 block text-xs leading-5 text-[#6e6e73]">{description}</span></span></button>;
}

function Impact({ label, value }: { label: string; value: number }) { return <span className="flex items-center justify-between gap-2"><span>{label}</span><strong className="text-[#1d1d1f]">{value}</strong></span>; }
function sumValues(values: Record<string, number>) { return Object.values(values).reduce((total, value) => total + value, 0); }
