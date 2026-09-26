/** 项目导读：赛事排班表生成器主流程：上传、识别、核对、分组、预览与导出都在这里串联，人员列始终留给人工填写。 */
"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronUp, Download, FileImage, FileText, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MobileFileShareButton } from "@/components/files/MobileFileShareButton";
import { Card } from "@/components/ui/Card";
import { formatDate, groupRosterEvents } from "@/lib/event-roster/grouping";
import { validateRosterEvents } from "@/lib/event-roster/validation";
import type { EventIssue, RosterEvent, ScheduleGroup } from "@/types/event-roster";

const steps = ["上传资料", "AI 识别", "核对赛事", "整理时间段", "生成表格"];
const allowedExtensions = /\.(pdf|png|jpe?g|docx?|xlsx?|pptx?)$/i;
const maxFileSize = 20 * 1024 * 1024;

type ProcessingPhase = "uploading" | "ai" | "error";

export function EventRosterBuilder({ backHref }: { backHref: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [instructions, setInstructions] = useState("");
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<ProcessingPhase>("uploading");
  const [events, setEvents] = useState<RosterEvent[]>([]);
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [exporting, setExporting] = useState(false);
  const issues = useMemo(() => validateRosterEvents(events), [events]);
  const issuesByEvent = useMemo(() => groupIssues(issues), [issues]);

  function addFiles(nextFiles: File[]) {
    const errors: string[] = [];
    const accepted = nextFiles.filter((file) => {
      if (!allowedExtensions.test(file.name)) { errors.push(`${file.name}：仅支持 PDF、图片、Word、Excel 和 PowerPoint`); return false; }
      if (file.size <= 0 || file.size > maxFileSize) { errors.push(`${file.name}：文件需大于 0 且不超过 20MB`); return false; }
      return true;
    });
    setFiles((current) => {
      const merged = [...current];
      for (const file of accepted) {
        if (!merged.some((item) => item.name === file.name && item.size === file.size)) merged.push(file);
      }
      if (merged.length > 8) errors.push("一次最多上传 8 个文件");
      return merged.slice(0, 8);
    });
    setMessage(errors.length ? errors.join("；") : null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function startRecognition() {
    if (!files.length) return;
    setStep(2);
    setPhase("uploading");
    setMessage(null);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("instructions", instructions);
      setPhase("ai");
      const response = await fetch("/api/tools/event-roster/extract", {
        method: "POST",
        body: formData
      });
      const result = await response.json() as { events?: RosterEvent[]; suggestedTitle?: string; message?: string };
      if (!response.ok || !result.events) throw new Error(result.message || "AI 分析失败");
      setEvents(result.events);
      setTitle(result.suggestedTitle?.trim() || "生命科学学院赛事跟进排班表");
      setStep(3);
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "文件分析失败");
    }
  }

  function updateEvent(id: string, patch: Partial<RosterEvent>) {
    setEvents((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function addEvent() {
    setEvents((current) => [...current, {
      id: crypto.randomUUID(), date: null, time: null, event: "", stage: null, location: null,
      sourceFile: "人工新增", sourcePage: 1, sourceText: "人工新增", confidence: "high"
    }]);
  }

  function prepareGroups() {
    setMessage(null);
    setGroups(groupRosterEvents(events, { maxGapMinutes: 0 }));
    setStep(4);
  }

  function updateGroup(id: string, patch: Partial<ScheduleGroup>) {
    setGroups((current) => current.map((group) => group.id === id ? { ...group, ...patch } : group));
  }

  function mergeNext(index: number) {
    setGroups((current) => {
      const left = current[index];
      const right = current[index + 1];
      if (!left || !right || left.date !== right.date) return current;
      return [...current.slice(0, index), {
        ...left,
        startTime: earlierTime(left.startTime, right.startTime),
        eventIds: [...left.eventIds, ...right.eventIds]
      }, ...current.slice(index + 2)];
    });
  }

  function splitGroup(groupId: string, eventIndex: number) {
    setGroups((current) => {
      const index = current.findIndex((group) => group.id === groupId);
      const source = current[index];
      if (!source || eventIndex <= 0 || eventIndex >= source.eventIds.length) return current;
      const leftIds = source.eventIds.slice(0, eventIndex);
      const rightIds = source.eventIds.slice(eventIndex);
      const left = recalculateGroup({ ...source, eventIds: leftIds }, events);
      const right = recalculateGroup({ ...source, id: crypto.randomUUID(), name: `${source.name}（拆分）`, eventIds: rightIds }, events);
      return [...current.slice(0, index), left, right, ...current.slice(index + 1)];
    });
  }

  function moveEvent(eventId: string, sourceId: string, targetId: string) {
    if (!targetId || sourceId === targetId) return;
    setGroups((current) => current
      .map((group) => group.id === sourceId ? { ...group, eventIds: group.eventIds.filter((id) => id !== eventId) } : group.id === targetId ? { ...group, eventIds: [...group.eventIds, eventId] } : group)
      .filter((group) => group.eventIds.length > 0)
      .map((group) => recalculateGroup(group, events)));
  }

  async function exportExcel() {
    setExporting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/tools/event-roster/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, events, groups })
      });
      if (!response.ok) {
        const result = await response.json() as { message?: string };
        throw new Error(result.message || "Excel 导出失败");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${sanitizeTitle(title) || "赛事跟进排班表"}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Excel 导出失败");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Link className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-[10px] px-2 text-sm font-medium text-[#6e6e73] hover:bg-black/[0.045] hover:text-[#1d1d1f]" href={backHref}><ArrowLeft size={17} />返回工具栏</Link>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-[#1d1d1f] sm:text-[2rem]">赛事排班表生成器</h1>
      </div>
      <StepBar current={step} />
      {message ? <div className="mb-4 flex items-start gap-2 rounded-[12px] border border-[#ff3b30]/20 bg-[#ff3b30]/10 px-4 py-3 text-sm text-[#d70015]" role="alert"><AlertTriangle className="mt-0.5 shrink-0" size={17} />{message}</div> : null}

      {step === 1 ? <Card>
        <h2 className="text-lg font-semibold text-[#1d1d1f]">上传赛事资料</h2>
        <div className={`mt-5 flex min-h-44 cursor-pointer items-center justify-center rounded-[14px] border-2 border-dashed px-5 text-center transition-colors ${dragging ? "border-[#0071e3] bg-[#0071e3]/10" : "border-black/15 bg-black/[0.018] hover:border-[#0071e3]/55 hover:bg-[#0071e3]/[0.04]"}`} onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { event.preventDefault(); setDragging(false); }} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
          <input accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="sr-only" multiple onChange={(event) => addFiles(Array.from(event.target.files ?? []))} ref={inputRef} type="file" />
          <div><UploadCloud className="mx-auto text-[#0071e3]" size={30} /><p className="mt-3 font-semibold text-[#1d1d1f]">拖拽资料到这里，或点击选择</p></div>
        </div>
        {files.length ? <div className="mt-5 divide-y divide-black/[0.06] rounded-[12px] border border-black/[0.08]">
          {files.map((file, index) => <div className="flex items-center gap-3 px-4 py-3" key={`${file.name}-${file.size}`}>
            {file.type === "application/pdf" ? <FileText className="shrink-0 text-[#ff3b30]" size={20} /> : <FileImage className="shrink-0 text-[#0071e3]" size={20} />}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#1d1d1f]">{file.name}</p></div>
            <button aria-label={`删除 ${file.name}`} className="grid size-10 place-items-center rounded-[10px] text-[#86868b] hover:bg-[#ff3b30]/10 hover:text-[#d70015]" onClick={(event) => { event.stopPropagation(); setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index)); }} type="button"><Trash2 size={17} /></button>
          </div>)}
        </div> : null}
        <label className="mt-5 block text-sm font-semibold text-[#3a3a3c]">
          本次识别要求
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-[12px] border border-black/[0.12] bg-white px-3.5 py-3 text-sm font-normal leading-6 text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/15 dark:bg-white/[0.06] dark:text-[#f5f5f7]"
            maxLength={2000}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="例如：这份表中“生科”也代表生科院；只提取田径项目；接力赛按每个组别分别列出。"
            value={instructions}
          />
        </label>
        <div className="mt-5 flex justify-end"><Button disabled={!files.length} onClick={startRecognition}>开始 AI 识别</Button></div>
      </Card> : null}

      {step === 2 ? <ProcessingCard onRetry={startRecognition} phase={phase} /> : null}
      {step === 3 ? <ReviewStep events={events} expandedSource={expandedSource} issuesByEvent={issuesByEvent} onAdd={addEvent} onDelete={(id) => setEvents((current) => current.filter((item) => item.id !== id))} onExpand={(id) => setExpandedSource((current) => current === id ? null : id)} onUpdate={updateEvent} /> : null}
      {step === 3 ? <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button onClick={() => setStep(1)} variant="secondary">重新上传</Button><Button disabled={!events.length} onClick={prepareGroups}>确认赛事并整理时间段</Button></div> : null}
      {step === 4 ? <GroupingStep events={events} groups={groups} onMerge={mergeNext} onMove={moveEvent} onSplit={splitGroup} onUpdate={updateGroup} /> : null}
      {step === 4 ? <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button onClick={() => setStep(3)} variant="secondary">返回核对赛事</Button><Button disabled={!groups.length || groups.some((group) => !group.name.trim())} onClick={() => setStep(5)}>生成表格预览</Button></div> : null}
      {step === 5 ? <PreviewStep events={events} exporting={exporting} groups={groups} onExport={exportExcel} onTitleChange={setTitle} title={title} /> : null}
      {step === 5 ? <div className="mt-5"><Button onClick={() => setStep(4)} variant="secondary">返回调整时间段</Button></div> : null}
    </>
  );
}

function StepBar({ current }: { current: number }) {
  return <ol className="mb-6 grid grid-cols-5 overflow-hidden rounded-[14px] border border-black/[0.08] bg-white/70 shadow-soft">{steps.map((label, index) => { const number = index + 1; const done = number < current; const active = number === current; return <li className={`flex min-w-0 flex-col items-center gap-1 border-r border-black/[0.06] px-1 py-3 text-center last:border-r-0 sm:flex-row sm:justify-center sm:gap-2 ${active ? "bg-[#0071e3]/10 text-[#0066cc]" : "text-[#86868b]"}`} key={label}><span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-[#34c759] text-white" : active ? "bg-[#0071e3] text-white" : "bg-black/[0.06]"}`}>{done ? <Check size={14} /> : number}</span><span className="truncate text-[10px] font-medium sm:text-xs">{label}</span></li>; })}</ol>;
}

function ProcessingCard({ phase, onRetry }: { phase: ProcessingPhase; onRetry: () => void }) {
  const copy = phase === "uploading" ? "正在上传…" : phase === "ai" ? "AI 识别中…" : "处理暂时中断";
  return <Card className="text-center"><div className={`mx-auto grid size-14 place-items-center rounded-full ${phase === "error" ? "bg-[#ff3b30]/10 text-[#d70015]" : "bg-[#0071e3]/10 text-[#0071e3]"}`}>{phase === "error" ? <AlertTriangle size={25} /> : <Loader2 className="animate-spin" size={25} />}</div><h2 className="mt-4 text-lg font-semibold text-[#1d1d1f]">{copy}</h2>{phase === "error" ? <div className="mt-5"><Button onClick={onRetry}>重试 AI 识别</Button></div> : null}</Card>;
}

function ReviewStep({ events, issuesByEvent, expandedSource, onUpdate, onDelete, onAdd, onExpand }: { events: RosterEvent[]; issuesByEvent: Map<string, EventIssue[]>; expandedSource: string | null; onUpdate: (id: string, patch: Partial<RosterEvent>) => void; onDelete: (id: string) => void; onAdd: () => void; onExpand: (id: string) => void }) {
  return <Card className="p-0 sm:p-0"><div className="flex flex-col gap-3 border-b border-black/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"><h2 className="text-lg font-semibold text-[#1d1d1f]">核对赛事</h2><Button onClick={onAdd} variant="secondary"><Plus className="mr-2" size={16} />手动新增</Button></div><div className="overflow-x-auto"><table className="min-w-[1040px] w-full text-sm"><thead className="bg-black/[0.025] text-left text-xs font-semibold text-[#6e6e73]"><tr><th className="px-3 py-3">日期</th><th className="px-3 py-3">时间</th><th className="px-3 py-3">比赛项目</th><th className="px-3 py-3">阶段</th><th className="px-3 py-3">地点</th><th className="px-3 py-3">状态 / 来源</th><th className="px-3 py-3">操作</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{events.map((item) => <RosterEventRow event={item} expanded={expandedSource === item.id} issues={issuesByEvent.get(item.id) ?? []} key={item.id} onDelete={() => onDelete(item.id)} onExpand={() => onExpand(item.id)} onUpdate={(patch) => onUpdate(item.id, patch)} />)}</tbody></table></div>{!events.length ? <p className="p-8 text-center text-sm text-[#86868b]">暂无赛事，请手动新增或重新识别。</p> : null}</Card>;
}

function RosterEventRow({ event, issues, expanded, onUpdate, onDelete, onExpand }: { event: RosterEvent; issues: EventIssue[]; expanded: boolean; onUpdate: (patch: Partial<RosterEvent>) => void; onDelete: () => void; onExpand: () => void }) {
  const inputClass = "w-full min-w-[8rem] border px-2.5 py-2 text-sm";
  return <><tr className="align-top"><td className="px-3 py-3"><input aria-label="日期" className={inputClass} onChange={(e) => onUpdate({ date: e.target.value || null })} type="date" value={event.date ?? ""} /></td><td className="px-3 py-3"><input aria-label="时间" className="w-[7.5rem] border px-2.5 py-2 text-sm" onChange={(e) => onUpdate({ time: e.target.value || null })} type="time" value={event.time ?? ""} /></td><td className="px-3 py-3"><input aria-label="比赛项目" className={inputClass} onChange={(e) => onUpdate({ event: e.target.value })} value={event.event} /></td><td className="px-3 py-3"><input aria-label="阶段" className={inputClass} onChange={(e) => onUpdate({ stage: e.target.value || null })} placeholder="可留空" value={event.stage ?? ""} /></td><td className="px-3 py-3"><input aria-label="地点" className={inputClass} onChange={(e) => onUpdate({ location: e.target.value || null })} placeholder="可留空" value={event.location ?? ""} /></td><td className="max-w-[15rem] px-3 py-3"><div className="flex flex-wrap gap-1">{issues.length ? issues.map((issue) => <span className="rounded-full bg-[#ff9f0a]/10 px-2 py-1 text-[11px] font-medium text-[#9a5700]" key={issue.kind}>⚠ {issue.message}</span>) : <span className="rounded-full bg-[#34c759]/10 px-2 py-1 text-[11px] font-medium text-[#248a3d]">正常</span>}</div><button className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0071e3]" onClick={onExpand} type="button">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}查看来源</button></td><td className="px-3 py-3"><button aria-label="删除赛事" className="grid size-9 place-items-center rounded-[9px] text-[#86868b] hover:bg-[#ff3b30]/10 hover:text-[#d70015]" onClick={onDelete} type="button"><Trash2 size={16} /></button></td></tr>{expanded ? <tr><td className="bg-black/[0.018] px-4 py-3 text-xs leading-5 text-[#6e6e73]" colSpan={7}><strong className="text-[#3a3a3c]">来源：</strong>{event.sourceFile} · 第 {event.sourcePage} 页<br /><strong className="text-[#3a3a3c]">原文：</strong>{event.sourceText || "无"}</td></tr> : null}</>;
}

function GroupingStep({ events, groups, onUpdate, onMerge, onSplit, onMove }: { events: RosterEvent[]; groups: ScheduleGroup[]; onUpdate: (id: string, patch: Partial<ScheduleGroup>) => void; onMerge: (index: number) => void; onSplit: (groupId: string, eventIndex: number) => void; onMove: (eventId: string, sourceId: string, targetId: string) => void }) {
  const eventMap = new Map(events.map((item) => [item.id, item]));
  return <div className="grid gap-4">{groups.map((group, groupIndex) => <Card key={group.id}><div className="flex flex-col gap-3 lg:flex-row lg:items-end"><label className="flex-1 text-xs font-medium text-[#6e6e73]">时间段名称<input className="mt-1 w-full border px-3 py-2 text-sm" onChange={(e) => onUpdate(group.id, { name: e.target.value })} value={group.name} /></label><label className="text-xs font-medium text-[#6e6e73]">开始时间<input className="mt-1 block border px-3 py-2 text-sm" onChange={(e) => onUpdate(group.id, { startTime: e.target.value || null })} type="time" value={group.startTime ?? ""} /></label>{groups[groupIndex + 1]?.date === group.date ? <Button onClick={() => onMerge(groupIndex)} variant="secondary">与下一段合并</Button> : null}</div><div className="mt-4 divide-y divide-black/[0.06] rounded-[10px] border border-black/[0.08]">{group.eventIds.map((eventId, eventIndex) => { const item = eventMap.get(eventId); if (!item) return null; return <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center" key={eventId}><div className="min-w-0 flex-1"><p className="text-sm font-medium text-[#1d1d1f]">{item.time || "时间待确认"} · {item.event || "项目待确认"}{item.stage ? `（${item.stage}）` : ""}</p><p className="mt-0.5 text-xs text-[#86868b]">{item.location || "未填写地点"}</p></div>{eventIndex > 0 ? <button className="text-xs font-medium text-[#0071e3]" onClick={() => onSplit(group.id, eventIndex)} type="button">从此拆分</button> : null}<select aria-label={`移动 ${item.event || "待确认赛事"} 到其他时间段`} className="border px-2 py-2 text-xs" onChange={(e) => { onMove(eventId, group.id, e.target.value); e.target.value = ""; }} defaultValue=""><option value="">移动到时间段…</option>{groups.filter((target) => target.id !== group.id && target.date === group.date).map((target) => <option key={target.id} value={target.id}>{target.startTime || "时间待确认"}</option>)}</select></div>; })}</div></Card>)}</div>;
}

function PreviewStep({ events, groups, title, onTitleChange, exporting, onExport }: { events: RosterEvent[]; groups: ScheduleGroup[]; title: string; onTitleChange: (value: string) => void; exporting: boolean; onExport: () => void }) {
  const eventMap = new Map(events.map((item) => [item.id, item]));
  const exportBody = JSON.stringify({ title, events, groups });
  const fileName = `${sanitizeTitle(title) || "赛事跟进排班表"}.xlsx`;
  return <Card><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><h2 className="text-lg font-semibold text-[#1d1d1f]">排班收集表预览</h2><label className="text-xs font-medium text-[#6e6e73]">文件名称<input className="mt-1 block w-full min-w-[17rem] border px-3 py-2 text-sm" onChange={(e) => onTitleChange(e.target.value)} placeholder="赛事跟进排班表" value={title} /></label></div><div className="mt-5 overflow-x-auto rounded-[12px] border border-black/[0.08]"><table className="min-w-[720px] w-full text-sm"><thead className="bg-black/[0.025] text-left text-xs font-semibold text-[#6e6e73]"><tr><th className="px-4 py-3">日期</th><th className="px-4 py-3">开始时间</th><th className="px-4 py-3">涉及比赛</th><th className="px-4 py-3">跟进人员</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{groups.map((group) => <tr key={group.id}><td className="px-4 py-3 align-top">{formatDate(group.date)}</td><td className="px-4 py-3 align-top tabular-nums">{group.startTime || "时间待确认"}</td><td className="px-4 py-3">{group.eventIds.map((id) => eventMap.get(id)).filter(Boolean).map((item) => <div key={item!.id}>{item!.event || "项目待确认"}{item!.stage ? `（${item!.stage}）` : ""}</div>)}</td><td className="px-4 py-3" /></tr>)}</tbody></table></div><div className="mt-5 flex flex-wrap justify-end gap-2"><Button disabled={exporting} onClick={onExport}>{exporting ? <><Loader2 className="mr-2 animate-spin" size={16} />正在生成</> : <><Download className="mr-2" size={16} />导出 Excel</>}</Button><MobileFileShareButton cacheKey={exportBody} fileName={fileName} onDownloadFallback={onExport} request={{ method: "POST", headers: { "Content-Type": "application/json" }, body: exportBody }} url="/api/tools/event-roster/export" /></div></Card>;
}

function recalculateGroup(group: ScheduleGroup, events: RosterEvent[]) {
  const allIncluded = group.eventIds.map((id) => events.find((item) => item.id === id)).filter((item): item is RosterEvent => Boolean(item));
  const included = allIncluded.filter((item): item is RosterEvent & { time: string } => Boolean(item.time)).sort((a, b) => a.time.localeCompare(b.time));
  if (!included.length) return group;
  return { ...group, eventIds: allIncluded.map((item) => item.id), date: allIncluded.find((item) => item.date)?.date ?? group.date, startTime: included[0].time };
}

function groupIssues(issues: EventIssue[]) { const result = new Map<string, EventIssue[]>(); issues.forEach((issue) => result.set(issue.eventId, [...(result.get(issue.eventId) ?? []), issue])); return result; }
function sanitizeTitle(value: string) { return value.trim().replace(/[\\/:*?"<>|]/g, "").slice(0, 80); }
function earlierTime(left: string | null, right: string | null) { return !left ? right : !right ? left : left < right ? left : right; }
