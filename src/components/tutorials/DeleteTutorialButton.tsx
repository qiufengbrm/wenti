/** 项目导读：教程组件：管理草稿、发布、附件和离开提醒；辛苦写的内容不能一返回就人间蒸发。 */
"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function DeleteTutorialButton({ tutorialId, title }: { tutorialId: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/tutorials/${tutorialId}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) return setError(result.message || "删除教程失败");
      setOpen(false);
      router.refresh();
    } catch {
      setError("网络异常，删除失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button className="gap-1.5 px-3 text-[#d70015] hover:bg-[#ff3b30]/10 hover:text-[#d70015]" onClick={() => setOpen(true)} variant="ghost"><Trash2 size={15} />删除</Button>
      {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
        <div aria-modal="true" className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-2xl" role="dialog">
          <div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-full bg-[#ff3b30]/10 text-[#d70015]"><AlertTriangle size={22} /></span><button aria-label="关闭" className="rounded-full p-2 text-[#86868b] hover:bg-black/[0.05]" disabled={pending} onClick={() => setOpen(false)}><X size={18} /></button></div>
          <h2 className="mt-4 text-lg font-semibold text-[#1d1d1f]">确定删除“{title}”？</h2>
          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">教程内容和附件都会被永久删除，无法恢复。</p>
          {error ? <p className="mt-3 text-sm text-[#d70015]">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-3"><Button disabled={pending} onClick={() => setOpen(false)} variant="secondary">取消</Button><Button disabled={pending} onClick={remove} variant="danger">{pending ? "删除中..." : "永久删除"}</Button></div>
        </div>
      </div> : null}
    </>
  );
}
