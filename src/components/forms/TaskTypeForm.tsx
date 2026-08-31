/** 项目导读：业务表单组件：收集输入并给出明确反馈；提交按钮不是许愿池，校验还是要认真做。 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function TaskTypeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [defaultHours, setDefaultHours] = useState("");
  const [description, setDescription] = useState("");
  const [defaultTemplate, setDefaultTemplate] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/task-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          defaultTemplate,
          defaultHours: defaultHours ? Number(defaultHours) : undefined,
          isActive: true
        })
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setMessage(result.message ?? "创建失败");
        return;
      }

      setName("");
      setDefaultHours("");
      setDescription("");
      setDefaultTemplate("");
      setMessage("模板创建成功");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        模板名称
        <input className="h-10 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500" onChange={(event) => setName(event.target.value)} placeholder="例如 摄影摄像" value={name} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        默认预计时长
        <input
          className="h-10 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500"
          min={0.5}
          onChange={(event) => setDefaultHours(event.target.value)}
          step={0.5}
          type="number"
          value={defaultHours}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        模板说明
        <textarea className="min-h-20 rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" onChange={(event) => setDescription(event.target.value)} value={description} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        默认任务内容
        <textarea className="min-h-32 rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" onChange={(event) => setDefaultTemplate(event.target.value)} value={defaultTemplate} />
      </label>
      {message ? <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</div> : null}
      <div className="flex justify-end">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "正在创建..." : "创建模板"}
        </Button>
      </div>
    </form>
  );
}
