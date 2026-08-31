/** 项目导读：任务流程组件：处理报名、取消、提交和审核；状态一步一步走，不能坐电梯乱窜楼层。 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ArchiveTaskButton({ taskId, archived = false }: { taskId: string; archived?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(archived);
  const [error, setError] = useState("");

  async function archiveTask() {
    if (pending || completed) return;
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" })
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(result.message || "归档失败");
        return;
      }
      setCompleted(true);
      router.refresh();
    } catch {
      setError("网络异常，请重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid justify-items-start gap-1">
      <Button className="gap-1.5 px-3" disabled={pending || completed} onClick={archiveTask} variant="ghost">
        {completed ? <Check size={15} /> : <Archive size={15} />}
        {completed ? "已归档" : pending ? "归档中..." : error ? "重新归档" : "归档"}
      </Button>
      {error ? <span className="max-w-28 text-xs text-[#d70015]" role="status">{error}</span> : null}
    </div>
  );
}
