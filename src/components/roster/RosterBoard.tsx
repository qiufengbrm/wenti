"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { dateForTeachingWeek } from "@/lib/roster-core";
import { RosterWeekTable, type RosterShift } from "@/components/roster/RosterWeekTable";

type Person = { id: string; name: string; volunteerSchedule?: { academicTerm: string; source: string } | null; campusSession?: { status: string; expiresAt: string } | null };
type Template = { dayOfWeek: number; startTime: string; endTime: string; location: string; requiredCount: number };
type Term = { id: string; code: string; startDate: string; weekCount: number; scheduleWeeks: number[]; templates?: Template[]; candidates?: Array<Person & { scheduleTerm?: string | null; scheduleSource?: string | null; campusStatus?: string | null; campusExpiresAt?: string | null }>; roster: { id: string; status: string; shifts: RosterShift[] } | null };
type Data = { terms: Term[]; volunteers?: Person[]; conflicts?: Array<{ shiftId: string; userId: string; name: string }> };
const initialTemplate: Template = { dayOfWeek: 1, startTime: "18:30", endTime: "20:00", location: "", requiredCount: 1 };

export function RosterBoard({ admin = false }: { admin?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [weekCount, setWeekCount] = useState(18);
  const [scheduleWeeks, setScheduleWeeks] = useState<number[]>(Array.from({ length: 18 }, (_, index) => index + 1));
  const [templates, setTemplates] = useState<Template[]>([{ ...initialTemplate }]);
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [week, setWeek] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const reload = useCallback(async () => {
    const response = await fetch("/api/roster", { cache: "no-store" });
    if (!response.ok) throw new Error("读取排班失败");
    const value = await response.json() as Data;
    setData(value);
    setSelected((old) => old || value.terms[0]?.id || "");
  }, []);

  useEffect(() => { reload().catch((error) => setMessage(String(error))); }, [reload]);
  const term = data?.terms.find((item) => item.id === selected);
  useEffect(() => { if (term && !term.scheduleWeeks.includes(week)) setWeek(term.scheduleWeeks[0] ?? 1); }, [term, week]);
  const activeWeek = term && !term.scheduleWeeks.includes(week) ? term.scheduleWeeks[0] ?? 1 : week;
  const weekDates = term ? Array.from({ length: 7 }, (_, index) => dateForTeachingWeek(term.startDate, activeWeek, index + 1)) : [];
  const weekShifts = term?.roster?.shifts.filter((shift) => shift.week === activeWeek) ?? [];
  const weekAssigned = weekShifts.reduce((sum, shift) => sum + shift.assignments.length, 0);
  const weekRequired = weekShifts.reduce((sum, shift) => sum + shift.requiredCount, 0);

  function editTerm(item: Term) {
    setSelected(item.id); setCode(item.code); setStartDate(item.startDate); setWeekCount(item.weekCount); setScheduleWeeks(item.scheduleWeeks);
    setTemplates(item.templates?.length ? item.templates : [{ ...initialTemplate }]);
    setCandidateIds(item.candidates?.map((candidate) => candidate.id) ?? []); setWeek(1);
  }

  async function action(url: string, body: object, method = "POST") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { message?: string; id?: string; vacancies?: number; excluded?: number; refreshed?: number; needsAuthorization?: string[] };
      if (!response.ok) throw new Error(result.message || "操作失败");
      await reload();
      if (result.id) setSelected(result.id);
      setMessage(result.vacancies !== undefined ? `已生成草稿：缺员 ${result.vacancies} 人次，跳过无有效课表成员 ${result.excluded} 人。` : result.refreshed !== undefined ? `成功刷新 ${result.refreshed} 人，${result.needsAuthorization?.length ?? 0} 人需重新授权。` : "操作成功");
    } catch (error) { setMessage(error instanceof Error ? error.message : "操作失败"); }
    finally { setBusy(false); }
  }

  function updateTemplate(index: number, patch: Partial<Template>) {
    setTemplates((old) => old.map((item, current) => current === index ? { ...item, ...patch } : item));
  }

  function updateAssignment(shift: RosterShift, index: number, userId: string) {
    const ids = shift.assignments.map((person) => person.id);
    ids.splice(index, 1, ...(userId ? [userId] : []));
    action(`/api/roster/shifts/${shift.id}`, { userIds: [...new Set(ids)] }, "PUT");
  }

  const adminConfig = admin ? <Card>
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-semibold">排班配置</h2><p className="mt-1 text-xs text-slate-500">学期、班次和候选成员</p></div>
        <button aria-expanded={configOpen} className="rounded-lg border px-3 py-2 text-sm" onClick={() => setConfigOpen((open) => !open)}>{configOpen ? "收起配置" : "展开配置"}</button>
      </div>
      {configOpen ? <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => { setSelected(""); setCode(""); setStartDate(""); setWeekCount(18); setScheduleWeeks(Array.from({ length: 18 }, (_, index) => index + 1)); setTemplates([{ ...initialTemplate }]); setCandidateIds([]); }}>新建学期</button>
        {data?.terms.map((item) => <button className="rounded-lg border px-3 py-2 text-sm" key={item.id} onClick={() => editTerm(item)}>{item.code}</button>)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">学期代码<input className="mt-1 w-full rounded-lg border p-2" disabled={term?.roster?.status === "PUBLISHED"} onChange={(event) => setCode(event.target.value)} placeholder="2026-2027-1" value={code} /></label>
        <label className="text-sm">首周周一<input className="mt-1 w-full rounded-lg border p-2" disabled={term?.roster?.status === "PUBLISHED"} onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} /></label>
        <label className="text-sm">教学周数<input className="mt-1 w-full rounded-lg border p-2" disabled={term?.roster?.status === "PUBLISHED"} max={30} min={1} onChange={(event) => { const count = Number(event.target.value); setWeekCount(count); setScheduleWeeks(Array.from({ length: Math.max(0, Math.min(30, count)) }, (_, index) => index + 1)); }} type="number" value={weekCount} /></label>
      </div>
      <h3 className="mt-5 text-sm font-semibold">排班周次</h3>
      <div className="mt-2 flex flex-wrap gap-2">{Array.from({ length: Math.max(0, Math.min(30, weekCount)) }, (_, index) => index + 1).map((number) => <label className="flex items-center gap-1 rounded-lg border px-2 py-1 text-sm" key={number}><input checked={scheduleWeeks.includes(number)} disabled={term?.roster?.status === "PUBLISHED"} onChange={(event) => setScheduleWeeks(event.target.checked ? [...scheduleWeeks, number].sort((a, b) => a - b) : scheduleWeeks.filter((value) => value !== number))} type="checkbox" />第 {number} 周</label>)}</div>
      <h3 className="mt-5 text-sm font-semibold">每周固定班次</h3>
      <div className="mt-2 grid gap-2">{templates.map((item, index) => <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_2fr_1fr_auto]" key={index}>
        <select aria-label="星期" className="rounded-lg border p-2" onChange={(event) => updateTemplate(index, { dayOfWeek: Number(event.target.value) })} value={item.dayOfWeek}>{["一", "二", "三", "四", "五", "六", "日"].map((day, dayIndex) => <option key={day} value={dayIndex + 1}>周{day}</option>)}</select>
        <input aria-label="开始时间" className="rounded-lg border p-2" onChange={(event) => updateTemplate(index, { startTime: event.target.value })} type="time" value={item.startTime} />
        <input aria-label="结束时间" className="rounded-lg border p-2" onChange={(event) => updateTemplate(index, { endTime: event.target.value })} type="time" value={item.endTime} />
        <input aria-label="地点" className="rounded-lg border p-2" onChange={(event) => updateTemplate(index, { location: event.target.value })} placeholder="地点" value={item.location} />
        <input aria-label="所需人数" className="rounded-lg border p-2" max={30} min={1} onChange={(event) => updateTemplate(index, { requiredCount: Number(event.target.value) })} type="number" value={item.requiredCount} />
        <button className="px-2 text-sm text-red-600" disabled={templates.length === 1} onClick={() => setTemplates(templates.filter((_, current) => current !== index))}>删除</button>
      </div>)}</div>
      <button className="mt-2 rounded-lg border px-3 py-2 text-sm" onClick={() => setTemplates([...templates, { ...initialTemplate }])}>增加班次</button>
      <h3 className="mt-5 text-sm font-semibold">候选成员</h3>
      <div className="mt-2 grid max-h-48 gap-2 overflow-auto sm:grid-cols-3">{data?.volunteers?.map((person) => <label className="flex items-center gap-2 text-sm" key={person.id}><input checked={candidateIds.includes(person.id)} onChange={(event) => setCandidateIds(event.target.checked ? [...candidateIds, person.id] : candidateIds.filter((id) => id !== person.id))} type="checkbox" />{person.name}<span className="text-xs text-slate-500">{person.volunteerSchedule?.academicTerm ?? "无课表"}</span></label>)}</div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={busy || term?.roster?.status === "PUBLISHED"} onClick={() => action("/api/roster/terms", { code, startDate, weekCount, scheduleWeeks, templates, candidateIds })}>保存配置</button>
        <button className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50" disabled={busy || !term?.id || term.roster?.status === "PUBLISHED"} onClick={() => action("/api/roster/generate", { termId: term!.id })}>生成草稿</button>
        <button className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50" disabled={busy || !term?.code} onClick={() => action("/api/schedules/ccnu/refresh-all", { term: term!.code })}>批量刷新课表</button>
      </div>
      </> : null}
    </Card> : null;

  return <div className="grid gap-5">
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-blue-700 dark:text-blue-300">排班总览</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">一周排班表</h2>
          <p className="mt-1 text-xs text-slate-500">按星期和时段查看全体成员的班次</p>
        </div>
        <select aria-label="选择学期" className="border px-3 py-2 text-sm" onChange={(event) => { setSelected(event.target.value); setWeek(1); }} value={selected}><option value="">选择学期</option>{data?.terms.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
      </div>
      {term?.roster ? <>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-slate-100 py-3 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${term.roster.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{term.roster.status === "PUBLISHED" ? "已发布" : "草稿"}</span>
            <strong className="text-sm text-slate-900 dark:text-slate-100">第 {activeWeek} 教学周</strong>
            <span className="text-xs tabular-nums text-slate-500">{weekDates[0]} — {weekDates[6]}</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">本周 {weekShifts.length} 班次 · 已排 {weekAssigned}/{weekRequired} 人次</span>
        </div>
        <div aria-label="选择排班周次" className="mt-4 flex flex-wrap gap-2" role="group">{term.scheduleWeeks.map((number) => <button aria-pressed={activeWeek === number} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${activeWeek === number ? "bg-blue-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`} key={number} onClick={() => setWeek(number)}>第 {number} 周</button>)}</div>
        <RosterWeekTable shifts={weekShifts} dates={weekDates} candidates={term.candidates ?? []} conflicts={admin ? data?.conflicts ?? [] : []} canEdit={admin && term.roster.status === "DRAFT"} busy={busy} onAssign={updateAssignment} />
        {admin && term.roster.status === "DRAFT" ? <button className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={busy || term.roster.shifts.some((shift) => shift.assignments.length !== shift.requiredCount)} onClick={() => action("/api/roster/publish", { termId: term.id })}>发布排班</button> : null}
      </> : <p className="mt-5 text-sm text-slate-500">{data ? `暂无${admin ? "排班草稿" : "已发布排班"}。` : "正在加载排班…"}</p>}
    </Card>
    {adminConfig}
    {message ? <p aria-live="polite" className="rounded-lg bg-slate-100 p-3 text-sm">{message}</p> : null}
  </div>;
}
