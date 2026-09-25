"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

function currentTerm() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}-${year + 1}-1` : `${year - 1}-${year}-2`;
}

export function CampusSync({ studentId, term: initialTerm, session }: { studentId: string; term: string; session: { status: string; expiresAt: string; lastSyncedAt: string | null } | null }) {
  const router = useRouter();
  const [username, setUsername] = useState(studentId);
  const [password, setPassword] = useState("");
  const [term, setTerm] = useState(/^\d{4}-\d{4}-[12]$/.test(initialTerm) ? initialTerm : currentTerm());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [authorized, setAuthorized] = useState(Boolean(session && session.status === "ACTIVE" && new Date(session.expiresAt) > new Date()));

  async function sync(method: "POST" | "PUT") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/schedules/ccnu", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(method === "POST" ? { username, password, term } : { term }) });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "同步失败");
      setAuthorized(true); setPassword(""); setMessage(data.message || "同步成功"); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "同步失败"); }
    finally { setBusy(false); }
  }

  return <Card>
    <h2 className="font-semibold text-slate-950">华师本科智慧教务同步</h2>
    <p className="mt-1 text-sm text-slate-500">校内密码仅用于此次登录，不会保存。授权会话最多保留 24 小时；失效后需要重新授权。原课表会保留。</p>
    <p className="mt-2 text-xs text-slate-500">状态：{authorized ? "已授权" : "需要授权"}{session?.lastSyncedAt ? ` · 最近同步 ${new Date(session.lastSyncedAt).toLocaleString("zh-CN")}` : ""}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-sm">学期<input aria-label="学期" className="mt-1 w-full rounded-lg border p-2" onChange={(event) => setTerm(event.target.value)} placeholder="2026-2027-1" value={term} /></label>
      <label className="text-sm">校内账号<input aria-label="校内账号" autoComplete="username" className="mt-1 w-full rounded-lg border p-2" onChange={(event) => setUsername(event.target.value)} value={username} /></label>
      <label className="text-sm">校内密码<input aria-label="校内密码" autoComplete="current-password" className="mt-1 w-full rounded-lg border p-2" onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={busy || !password || !studentId} onClick={() => sync("POST")}>授权并同步</button>
      <button className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50" disabled={busy || !authorized} onClick={() => sync("PUT")}>使用当前授权再次同步</button>
    </div>
    {!studentId ? <p className="mt-2 text-sm text-amber-700">请先在个人信息中登记学号。</p> : null}
    {message ? <p aria-live="polite" className="mt-3 text-sm">{message}</p> : null}
  </Card>;
}
