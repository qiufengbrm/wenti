/** 项目导读：业务表单组件：收集输入并给出明确反馈；提交按钮不是许愿池，校验还是要认真做。 */
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";

interface TaskTypeOption {
  id: string;
  name: string;
  defaultTemplate: string;
  defaultHours: number | string;
  isActive: boolean;
}

export function TaskPublishForm({ taskTypes }: { taskTypes: TaskTypeOption[] }) {
  const activeTaskTypes = useMemo(() => taskTypes.filter((item) => item.isActive), [taskTypes]);
  const [selectedTypeId, setSelectedTypeId] = useState(activeTaskTypes[0]?.id ?? "");
  const selectedType = activeTaskTypes.find((item) => item.id === selectedTypeId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(selectedType?.defaultTemplate ?? "");
  const [estimatedHours, setEstimatedHours] = useState(String(selectedType?.defaultHours ?? ""));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startClockTime, setStartClockTime] = useState("");
  const [endClockTime, setEndClockTime] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [needProof, setNeedProof] = useState(true);
  const [allowCancel, setAllowCancel] = useState(true);
  const [cancelNeedsReview, setCancelNeedsReview] = useState(true);
  const [message, setMessage] = useState("");

  function handleTypeChange(typeId: string) {
    const nextType = activeTaskTypes.find((item) => item.id === typeId);
    setSelectedTypeId(typeId);
    setDescription(nextType?.defaultTemplate ?? "");
    setEstimatedHours(String(nextType?.defaultHours ?? ""));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        typeId: selectedTypeId,
        description,
        startDate,
        endDate,
        startClockTime,
        endClockTime,
        maxMembers: Number(maxMembers),
        estimatedHours: Number(estimatedHours),
        needProof,
        allowCancel,
        cancelNeedsReview,
        status: "PUBLISHED"
      })
    });

    const result = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(result.message ?? (response.ok ? "任务已发布。" : "发布失败，请稍后重试。"));

    if (response.ok) {
      setTitle("");
      setMaxMembers("");
    }
  }

  return (
    <Card>
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            任务标题
            <input className="h-10 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500" onChange={(event) => setTitle(event.target.value)} placeholder="请输入任务标题" value={title} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            任务类型
            <select
              className="h-10 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500"
              onChange={(event) => handleTypeChange(event.target.value)}
              value={selectedTypeId}
            >
              {activeTaskTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 text-sm font-medium text-slate-700"><span>开始日期</span><DatePicker ariaLabel="选择任务开始日期" onChange={setStartDate} value={startDate} /></div>
          <div className="grid gap-2 text-sm font-medium text-slate-700"><span>结束日期</span><DatePicker ariaLabel="选择任务结束日期" min={startDate || undefined} onChange={setEndDate} value={endDate} /></div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            开始时间 <span className="text-xs font-normal text-slate-400">选填</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500" disabled={!startDate} onChange={(event) => setStartClockTime(event.target.value)} type="time" value={startClockTime} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            结束时间 <span className="text-xs font-normal text-slate-400">选填</span>
            <input className="h-10 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500" disabled={!endDate} onChange={(event) => setEndClockTime(event.target.value)} type="time" value={endClockTime} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            所需人数
            <input className="h-10 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500" min={1} onChange={(event) => setMaxMembers(event.target.value)} type="number" value={maxMembers} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            预计任务时长
            <input
              className="h-10 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500"
              min={0.5}
              onChange={(event) => setEstimatedHours(event.target.value)}
              step={0.5}
              type="number"
              value={estimatedHours}
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          任务详细内容
          <textarea
            className="min-h-48 rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
        <div className="grid gap-4 rounded-[12px] border border-black/[0.07] bg-black/[0.025] p-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input checked={needProof} className="h-4 w-4" onChange={(event) => setNeedProof(event.target.checked)} type="checkbox" />
            需要完成证明
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input checked={allowCancel} className="h-4 w-4" onChange={(event) => setAllowCancel(event.target.checked)} type="checkbox" />
            允许志愿者申请取消报名
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input checked={cancelNeedsReview} className="h-4 w-4" onChange={(event) => setCancelNeedsReview(event.target.checked)} type="checkbox" />
            取消申请需由发布任务的部门负责人审核
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input className="h-4 w-4" defaultChecked disabled type="checkbox" />
            实际完成时长需由发布任务的部门负责人审核
          </label>
        </div>
        <div className="rounded-[10px] bg-[#0071e3]/10 px-3.5 py-2.5 text-[13px] text-[#0066cc]">
          前端校验预留：时间顺序、人数大于 0、预计时长必须是 0.5 的倍数；后端 API 也需要重复校验。
        </div>
        {message ? <div className="rounded-[10px] bg-black/[0.04] px-3.5 py-2.5 text-[13px] text-[#3a3a3c]" role="status">{message}</div> : null}
        <div className="flex flex-col-reverse gap-2 border-t border-black/[0.07] pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary">保存草稿</Button>
          <Button type="submit">发布任务</Button>
        </div>
      </form>
    </Card>
  );
}
