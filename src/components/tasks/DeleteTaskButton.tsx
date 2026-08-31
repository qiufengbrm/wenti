/** 项目导读：任务流程组件：处理报名、取消、提交和审核；状态一步一步走，不能坐电梯乱窜楼层。 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DeleteTaskButton({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function deleteTask() {
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(result.message || "删除失败，请重试");
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
      <Button className="gap-1.5 px-3 text-[#d70015] hover:bg-[#ff3b30]/10 hover:text-[#d70015]" onClick={() => setOpen(true)} variant="ghost">
        <Trash2 size={15} />
        删除
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <div aria-labelledby={`delete-task-${taskId}`} aria-modal="true" className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-2xl" role="dialog">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ff3b30]/10 text-[#d70015]">
                <AlertTriangle size={22} />
              </div>
              <button
                aria-label="关闭删除确认框"
                className="grid size-8 place-items-center rounded-full text-[#6e6e73] transition-colors hover:bg-black/[0.055]"
                disabled={pending}
                onClick={() => setOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#1d1d1f]" id={`delete-task-${taskId}`}>确定永久删除“{taskTitle}”？</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
              该任务、报名记录和完成提交将永久删除，无法恢复。已经审核通过的志愿时长会保留，但会解除与该任务的关联。
            </p>
            {error ? <p className="mt-3 text-sm text-[#d70015]" role="alert">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button disabled={pending} onClick={() => setOpen(false)} variant="secondary">取消</Button>
              <Button disabled={pending} onClick={deleteTask} variant="danger">
                {pending ? "删除中..." : "永久删除"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
