/** 项目导读：业务表单组件：收集输入并给出明确反馈；提交按钮不是许愿池，校验还是要认真做。 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markLoginSession } from "@/components/auth/SessionGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { roleLabels, type Role } from "@/types/role";

export function MockLoginForm({
  title,
  description,
  allowedRoles,
  alternateHref,
  alternateLabel
}: {
  title: string;
  description: string;
  allowedRoles: Role[];
  alternateHref?: string;
  alternateLabel?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        allowedRoles,
        rememberMe
      })
    });

    const result = (await response.json().catch(() => ({}))) as { message?: string; redirectTo?: string };

    if (!response.ok || !result.redirectTo) {
      setError(result.message ?? "登录失败，请稍后重试。");
      return;
    }

    markLoginSession(rememberMe);
    router.push(result.redirectTo);
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f5f5f7] px-5 py-12">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <div className="w-full max-w-[440px]">
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-[13px] bg-[#0071e3] text-xl font-semibold text-white shadow-sm">文</span>
          <p className="mt-4 text-[13px] font-semibold text-[#0066cc]">文艺体育中心</p>
          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.035em] text-[#1d1d1f]">{title}</h1>
          <p className="mt-2 text-[13px] leading-6 text-[#6e6e73]">{description}</p>
        </div>
      <Card className="w-full p-6 sm:p-8">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-[13px] font-semibold text-[#3a3a3c]">
            账号
            <input
              className="h-11 border px-3.5 outline-none"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入账号"
              value={username}
            />
          </label>
          <label className="grid gap-2 text-[13px] font-semibold text-[#3a3a3c]">
            密码
            <input
              className="h-11 border px-3.5 outline-none"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              type="password"
              value={password}
            />
          </label>
          <label className="flex items-center gap-2.5 text-[13px] font-medium text-[#515154]">
            <input
              checked={rememberMe}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
              onChange={(event) => setRememberMe(event.target.checked)}
              type="checkbox"
            />
            保持登录
          </label>
          <p className="rounded-[10px] bg-black/[0.035] px-3.5 py-2.5 text-[12px] text-[#6e6e73]">当前入口支持：{allowedRoles.map((item) => roleLabels[item]).join("、")}</p>
          {error ? <p className="rounded-[10px] bg-[#ff3b30]/10 px-3.5 py-2.5 text-[13px] text-[#d70015]" role="alert">{error}</p> : null}
          <Button className="mt-1 h-11 w-full text-[14px]" type="submit">
            登录
          </Button>
        </form>
        <div className="mt-6 border-t border-black/[0.07] pt-5 text-[12px] leading-5 text-[#86868b]">
          <p>如果忘记密码，请联系部门负责人重置密码。</p>
          {alternateHref && alternateLabel ? (
            <Link className="mt-3 inline-flex font-semibold text-[#0066cc] hover:text-[#0077ed]" href={alternateHref}>
              {alternateLabel}
            </Link>
          ) : null}
        </div>
      </Card>
      </div>
    </main>
  );
}
