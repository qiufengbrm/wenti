/** 项目导读：共享 GLM 凭据控制台：只展示掩码，不回传旧明文。 */
"use client";

import { Check, KeyRound, LoaderCircle, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AiProviderStatus, CredentialStatus } from "@/lib/ai-provider-settings";

type Provider = "glm";

const providers: Array<{ id: Provider; title: string; description: string; placeholder: string }> = [
  { id: "glm", title: "GLM API Key", description: "用于直接读取 PDF 与图片，并生成赛事排班表。", placeholder: "粘贴智谱 GLM API Key" }
];

export function AiProviderSettings({ initialStatus }: { initialStatus: AiProviderStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [values, setValues] = useState<Record<Provider, string>>({ glm: "" });
  const [busy, setBusy] = useState<`${"save" | "clear"}-${Provider}` | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  async function save(provider: Provider) {
    const credential = values[provider].trim();
    if (!credential) return;
    setBusy(`save-${provider}`);
    setFeedback(null);
    try {
      const response = await fetch("/api/settings/ai-provider", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, credential })
      });
      const result = await response.json() as { data?: AiProviderStatus; message?: string };
      if (!response.ok) throw new Error(result.message || "保存凭据失败");
      if (result.data) setStatus(result.data);
      setValues((current) => ({ ...current, [provider]: "" }));
      setFeedback({ kind: "success", message: result.message || "共享凭据已保存" });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "保存凭据失败" });
    } finally {
      setBusy(null);
    }
  }

  async function clear(provider: Provider) {
    const label = "GLM API Key";
    if (!window.confirm(`确定清除数据库中的共享 ${label}？清除后可能回退到服务器环境变量。`)) return;
    setBusy(`clear-${provider}`);
    setFeedback(null);
    try {
      const response = await fetch(`/api/settings/ai-provider?provider=${provider}`, { method: "DELETE" });
      const result = await response.json() as { data?: AiProviderStatus; message?: string };
      if (!response.ok) throw new Error(result.message || "清除凭据失败");
      if (result.data) setStatus(result.data);
      setFeedback({ kind: "success", message: result.message || "共享凭据已清除" });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "清除凭据失败" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#5856d6]/10 text-[#5856d6]"><KeyRound size={20} /></span>
        <div><h2 className="font-semibold text-[#1d1d1f]">赛事工具 API 配置</h2><p className="mt-1 text-[13px] leading-5 text-[#6e6e73]">超级管理员统一配置后，管理员和志愿者通过服务端共享使用，前端不会拿到明文凭据。</p></div>
      </div>

      {!status.encryptionReady ? <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-[#ff9f0a]/10 px-3 py-2.5 text-[13px] leading-5 text-[#9a5700]" role="alert"><TriangleAlert className="mt-0.5 shrink-0" size={16} />服务器尚未配置 AI_SETTINGS_ENCRYPTION_KEY。输入框现已可以输入，但保存前仍需配置主加密密钥并重启服务。</p> : null}

      <div className="mt-5 grid gap-4">
        {providers.map((provider) => (
          <CredentialCard
            busy={busy}
            clear={() => clear(provider.id)}
            definition={provider}
            key={provider.id}
            save={() => save(provider.id)}
            setValue={(value) => setValues((current) => ({ ...current, [provider.id]: value }))}
            status={status[provider.id]}
            updatedAt={status.updatedAt}
            value={values[provider.id]}
          />
        ))}
      </div>

      <p className="mt-4 text-[12px] leading-5 text-[#86868b]">GLM 凭据使用 AES-256-GCM 加密后写入数据库。普通账号无法查看或修改，只能通过赛事工具后端间接调用。</p>

      {feedback ? <p className={`mt-4 flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] ${feedback.kind === "success" ? "bg-[#34c759]/10 text-[#197a31]" : "bg-[#ff3b30]/10 text-[#c7231a]"}`} role="status">{feedback.kind === "success" ? <Check size={16} /> : <TriangleAlert size={16} />}{feedback.message}</p> : null}
    </Card>
  );
}

function CredentialCard({ definition, status, value, setValue, save, clear, busy, updatedAt }: {
  definition: (typeof providers)[number]; status: CredentialStatus; value: string; setValue: (value: string) => void;
  save: () => void; clear: () => void; busy: string | null; updatedAt: string | null;
}) {
  const saving = busy === `save-${definition.id}`;
  const clearing = busy === `clear-${definition.id}`;
  const sourceText = status.source === "database" ? "管理面板配置" : status.source === "environment" ? "服务器环境变量后备值" : "尚未配置";
  return (
    <section className="rounded-[14px] border border-black/[0.08] p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-[14px] font-semibold text-[#1d1d1f]">{definition.title}</h3><p className="mt-1 text-[12px] leading-5 text-[#6e6e73]">{definition.description}</p></div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${status.configured ? "bg-[#34c759]/10 text-[#197a31]" : "bg-[#ff9f0a]/10 text-[#9a5700]"}`}>{status.configured ? <ShieldCheck size={12} /> : <TriangleAlert size={12} />}{status.configured ? "已配置" : "未配置"}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-[10px] bg-black/[0.025] p-3 text-[12px]">
        <div><p className="text-[#86868b]">当前来源</p><p className="mt-1 font-semibold text-[#3a3a3c]">{sourceText}</p></div>
        <div><p className="text-[#86868b]">凭据标识</p><p className="mt-1 font-mono font-semibold text-[#3a3a3c]">{status.maskedValue || "—"}</p></div>
      </div>
      <label className="mt-4 grid gap-2 text-[12px] font-semibold text-[#3a3a3c]">
        {status.source === "database" ? "替换凭据" : "新的凭据"}
        <input autoComplete="new-password" className="border px-3 py-2.5 text-[14px] font-normal" disabled={Boolean(busy)} maxLength={1000} onChange={(event) => setValue(event.target.value)} placeholder={`${definition.placeholder}；保存后不显示明文`} type="password" value={value} />
      </label>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/[0.07] pt-4">
        <div>
          {status.source === "database" ? (
            <Button disabled={Boolean(busy)} onClick={clear} variant="danger">{clearing ? <><LoaderCircle className="mr-2 animate-spin" size={15} />清除中...</> : <><Trash2 className="mr-2" size={15} />清除配置</>}</Button>
          ) : (
            <Button disabled variant="danger"><Trash2 className="mr-2" size={15} />{status.source === "environment" ? "环境变量配置" : "暂无可清除配置"}</Button>
          )}
          {updatedAt ? <p className="mt-1.5 text-[10px] text-[#86868b]">更新于 {formatTime(updatedAt)}</p> : null}
        </div>
        <Button disabled={Boolean(busy) || !value.trim()} onClick={save}>{saving ? <><LoaderCircle className="mr-2 animate-spin" size={15} />保存中...</> : "保存"}</Button>
      </div>
    </section>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
