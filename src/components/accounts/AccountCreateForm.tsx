/** 项目导读：账号管理组件：创建或删除账号时把权限与关联数据说明白，删人不是按一下就当无事发生。 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type AccountRole = "ADMIN" | "VOLUNTEER";

export function AccountCreateForm() {
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>("ADMIN");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("123456");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name, username, password })
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setFeedback({ tone: "error", message: result.message ?? "创建账号失败" });
        return;
      }

      setFeedback({ tone: "success", message: result.message ?? "账号创建成功" });
      setName("");
      setUsername("");
      setPassword("123456");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-[13px] font-semibold text-[#3a3a3c]">
        账号类型
        <select className="h-10 border px-3 outline-none" onChange={(event) => setRole(event.target.value as AccountRole)} value={role}>
          <option value="ADMIN">部门负责人</option>
          <option value="VOLUNTEER">普通志愿者</option>
        </select>
      </label>
      <label className="grid gap-2 text-[13px] font-semibold text-[#3a3a3c]">
        姓名
        <input className="h-10 border px-3 outline-none" maxLength={50} onChange={(event) => setName(event.target.value)} placeholder="请输入姓名" required value={name} />
      </label>
      <label className="grid gap-2 text-[13px] font-semibold text-[#3a3a3c]">
        登录账号
        <input className="h-10 border px-3 outline-none" maxLength={50} minLength={3} onChange={(event) => setUsername(event.target.value)} placeholder="管理员账号或学生学号" required value={username} />
        {role === "VOLUNTEER" ? <span className="text-[11px] font-normal leading-5 text-[#86868b]">普通志愿者的登录账号将同时作为学号。</span> : null}
      </label>
      <label className="grid gap-2 text-[13px] font-semibold text-[#3a3a3c]">
        初始密码
        <input className="h-10 border px-3 outline-none" maxLength={128} minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
      </label>
      {feedback ? (
        <div className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[13px] ${feedback.tone === "success" ? "bg-[#34c759]/10 text-[#248a3d]" : "bg-[#ff3b30]/10 text-[#d70015]"}`} role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.tone === "success" ? <CheckCircle2 size={16} /> : null}
          {feedback.message}
        </div>
      ) : null}
      <div className="flex justify-end border-t border-black/[0.07] pt-5">
        <Button disabled={submitting} type="submit">
          {submitting ? "正在创建..." : "创建账号"}
        </Button>
      </div>
    </form>
  );
}
