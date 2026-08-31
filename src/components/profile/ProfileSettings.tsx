/** 项目导读：个人资料组件：维护账号与资料字段；能让用户自己改的就别麻烦数据库管理员半夜加班。 */
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Plus, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ProfileData = {
  name: string;
  username: string;
  studentId: string;
  grade: string;
  major: string;
  className: string;
  phone: string;
  qq: string;
  wechat: string;
  skills: string;
};

export function ProfileSettings({ initialData, suggestedSkills, mode = "volunteer" }: { initialData: ProfileData; suggestedSkills: string[]; mode?: "volunteer" | "admin" }) {
  const router = useRouter();
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  function update(key: keyof ProfileData, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          studentId: form.studentId,
          grade: form.grade,
          major: form.major,
          className: form.className,
          phone: form.phone,
          qq: form.qq,
          wechat: form.wechat,
          skills: form.skills
        })
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "保存失败，请稍后重试");
      setMessage({ type: "success", text: result.message || "资料已保存" });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "保存失败，请稍后重试" });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMessage(null);
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage({ type: "error", text: "两次输入的新密码不一致" });
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords)
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "密码修改失败");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage({ type: "success", text: result.message || "密码修改成功" });
    } catch (error) {
      setPasswordMessage({ type: "error", text: error instanceof Error ? error.message : "密码修改失败" });
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
      <Card>
        <div className="mb-6 flex items-start gap-3 border-b border-black/[0.07] pb-5">
          <div className="rounded-[10px] bg-[#0071e3]/10 p-2.5 text-[#0071e3]"><UserRound size={20} /></div>
          <div>
            <h2 className="font-semibold text-slate-950">个人信息</h2>
            <p className="mt-1 text-sm text-slate-500">{mode === "volunteer" ? "个人资料均可自行修改，保存后将同步至部门负责人端。" : "姓名和登录账号均可自行修改。"}</p>
          </div>
        </div>

        <form className="grid gap-5" onSubmit={saveProfile}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="姓名" maxLength={50} placeholder="请输入姓名" required value={form.name} onChange={(value) => update("name", value)} />
            <Field label="登录账号" maxLength={50} placeholder="请输入登录账号" required value={form.username} onChange={(value) => update("username", value)} />
            {mode === "volunteer" ? (
              <>
                <Field label="学号" maxLength={50} placeholder="请输入学号" value={form.studentId} onChange={(value) => update("studentId", value)} />
                <Field label="年级" maxLength={30} placeholder="例如：2025级" value={form.grade} onChange={(value) => update("grade", value)} />
                <Field label="专业" maxLength={100} placeholder="请输入专业" value={form.major} onChange={(value) => update("major", value)} />
                <Field label="班级" maxLength={100} placeholder="请输入班级" value={form.className} onChange={(value) => update("className", value)} />
              </>
            ) : null}
          </div>
          {mode === "volunteer" ? (
            <>
              <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                <Field label="联系电话" placeholder="请输入手机号" value={form.phone} onChange={(value) => update("phone", value)} />
                <Field label="QQ" placeholder="请输入 QQ 号" value={form.qq} onChange={(value) => update("qq", value)} />
                <Field label="微信" placeholder="请输入微信号" value={form.wechat} onChange={(value) => update("wechat", value)} />
              </div>
              <SkillSelector suggestedSkills={suggestedSkills} value={form.skills} onChange={(value) => update("skills", value)} />
            </>
          ) : null}
          {message ? <Feedback {...message} /> : null}
          <div className="flex justify-end border-t border-black/[0.07] pt-5">
            <Button disabled={saving} type="submit">
              {saving ? <><Loader2 className="mr-2 animate-spin" size={16} />保存中</> : "保存资料"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="self-start">
        <div className="mb-6 flex items-start gap-3 border-b border-black/[0.07] pb-5">
          <div className="rounded-[10px] bg-[#ff9f0a]/10 p-2.5 text-[#c76b00]"><KeyRound size={20} /></div>
          <div>
            <h2 className="font-semibold text-slate-950">账号安全</h2>
            <p className="mt-1 text-sm text-slate-500">建议使用至少 8 位且不易被猜到的密码。</p>
          </div>
        </div>
        <form className="grid gap-4" onSubmit={changePassword}>
          {(["currentPassword", "newPassword", "confirmPassword"] as const).map((key, index) => (
            <label className="grid gap-2 text-sm font-medium text-slate-700" key={key}>
              {["当前密码", "新密码", "确认新密码"][index]}
              <div className="relative">
                <input
                  className="h-10 w-full rounded-md border border-slate-200 px-3 pr-10 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setPasswords((current) => ({ ...current, [key]: event.target.value }))}
                  required
                  type={showPasswords ? "text" : "password"}
                  value={passwords[key]}
                />
                {index === 0 ? (
                  <button aria-label={showPasswords ? "隐藏密码" : "显示密码"} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600" onClick={() => setShowPasswords((value) => !value)} type="button">
                    {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                ) : null}
              </div>
            </label>
          ))}
          {passwordMessage ? <Feedback {...passwordMessage} /> : null}
          <Button className="mt-1 w-full" disabled={changingPassword} type="submit">
            {changingPassword ? <><Loader2 className="mr-2 animate-spin" size={16} />修改中</> : "修改密码"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, value, placeholder, multiline = false, maxLength = 50, required = false, onChange }: { label: string; value: string; placeholder: string; multiline?: boolean; maxLength?: number; required?: boolean; onChange: (value: string) => void }) {
  const classes = "w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      {multiline ? <textarea className={`${classes} min-h-24 resize-y`} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} value={value} /> : <input className={`${classes} h-10`} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} value={value} />}
    </label>
  );
}

function SkillSelector({ value, suggestedSkills, onChange }: { value: string; suggestedSkills: string[]; onChange: (value: string) => void }) {
  const [customSkill, setCustomSkill] = useState("");
  const [error, setError] = useState("");
  const selected = parseSkills(value);
  const availableSkills = suggestedSkills.filter((skill) => !selected.includes(skill));

  function commit(next: string[]) {
    onChange(Array.from(new Set(next)).join("、"));
    setError("");
  }

  function toggle(skill: string) {
    if (selected.includes(skill)) {
      commit(selected.filter((item) => item !== skill));
      return;
    }
    if (selected.length >= 20) {
      setError("最多可选择 20 个特长词条");
      return;
    }
    commit([...selected, skill]);
  }

  function addCustomSkill() {
    const skill = customSkill.trim();
    if (!skill) return;
    if (skill.length > 20) {
      setError("单个特长词条不能超过 20 个字符");
      return;
    }
    if (selected.length >= 20 && !selected.includes(skill)) {
      setError("最多可选择 20 个特长词条");
      return;
    }
    if (!selected.includes(skill)) commit([...selected, skill]);
    setCustomSkill("");
  }

  return (
    <fieldset className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-sm font-medium text-slate-700">特长</legend>
        <span className="text-xs text-slate-400">已选择 {selected.length}/20</span>
      </div>
      <p className="text-xs leading-5 text-slate-500">想到什么就写什么：会拍照、能搬桌子、擅长救场，甚至“方向感很好”都算。别让你的隐藏技能继续潜水。</p>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-[12px] bg-[#0071e3]/[0.065] p-3" aria-label="已选择的特长">
          {selected.map((skill) => (
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-[#0071e3] pl-3 pr-1.5 text-sm font-medium text-white" key={skill}>
              {skill}
              <button aria-label={`移除特长 ${skill}`} className="flex size-6 items-center justify-center rounded-full text-blue-100 transition-colors duration-150 hover:bg-blue-700 hover:text-white active:bg-blue-800" onClick={() => commit(selected.filter((item) => item !== skill))} type="button">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      ) : <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">暂未添加特长。</p>}

      {availableSkills.length > 0 ? <div className="flex flex-wrap gap-2" aria-label="其他志愿者添加过的特长">
          {availableSkills.map((skill) => (
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-[background-color,color,border-color,transform] duration-150 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 active:scale-[0.97]"
              key={skill}
              onClick={() => toggle(skill)}
              type="button"
            >
              <Plus className="mr-1.5 inline" size={14} />{skill}
            </button>
          ))}
        </div> : null}

      <div>
        <label className="mb-2 block text-xs text-slate-500" htmlFor="custom-skill">添加特长</label>
        <div className="flex gap-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            id="custom-skill"
            maxLength={20}
            onChange={(event) => { setCustomSkill(event.target.value); setError(""); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomSkill();
              }
            }}
            placeholder="比如：摄影、写推文、能把场子热起来"
            value={customSkill}
          />
          <Button disabled={!customSkill.trim()} onClick={addCustomSkill} variant="secondary"><Plus className="mr-1.5" size={16} />添加</Button>
        </div>
        {error ? <p className="mt-2 text-xs text-red-600" role="alert">{error}</p> : null}
      </div>
    </fieldset>
  );
}

function parseSkills(value: string) {
  return value.split(/[、,，;；/\n]+/).map((skill) => skill.trim()).filter(Boolean);
}

function Feedback({ type, text }: { type: "success" | "error"; text: string }) {
  return <div className={`flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[13px] ${type === "success" ? "bg-[#34c759]/10 text-[#248a3d]" : "bg-[#ff3b30]/10 text-[#d70015]"}`} role={type === "error" ? "alert" : "status"}>{type === "success" ? <CheckCircle2 size={16} /> : null}{text}</div>;
}
