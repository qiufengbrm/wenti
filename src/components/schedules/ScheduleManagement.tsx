/** 项目导读：课表组件：把课程和空闲时间变成看得懂的界面；红黄绿各司其职，不在这里表演交通灯蹦迪。 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, CalendarX2, ChevronLeft, ChevronRight, Clock3, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import type { ScheduleData } from "@/types/schedule";

type VolunteerScheduleRow = {
  id: string;
  name: string;
  studentId: string;
  major: string;
  className: string;
  phone: string;
  schedule: ScheduleData | null;
};

const pageSize = 10;
const todayInShanghai = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
const knownTermStarts: Record<string, string> = { "2026-2027-1": "2026-08-31" };

export function ScheduleManagement({ volunteers }: { volunteers: VolunteerScheduleRow[] }) {
  const [date, setDate] = useState(todayInShanghai);
  const [time, setTime] = useState("15:00");
  const [keyword, setKeyword] = useState("");
  const [major, setMajor] = useState("");
  const [className, setClassName] = useState("");
  const [filters, setFilters] = useState({ date: false, time: false, keyword: false, major: false, className: false });
  const [page, setPage] = useState(1);

  const uploaded = volunteers.filter((volunteer) => volunteer.schedule);
  const missing = volunteers.filter((volunteer) => !volunteer.schedule);
  const majorOptions = useMemo(() => Array.from(new Set(uploaded.map((item) => item.major).filter((value) => value && value !== "-"))).sort((a, b) => a.localeCompare(b, "zh-CN")), [uploaded]);
  const classOptions = useMemo(() => Array.from(new Set(uploaded.map((item) => item.className).filter((value) => value && value !== "-"))).sort((a, b) => a.localeCompare(b, "zh-CN")), [uploaded]);
  const directoryFiltered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return volunteers.filter((volunteer) => {
      const matchesKeyword = !filters.keyword || !normalized || [volunteer.name, volunteer.studentId].some((value) => value.toLowerCase().includes(normalized));
      if (!matchesKeyword) return false;
      if (filters.major && major && volunteer.major !== major) return false;
      if (filters.className && className && volunteer.className !== className) return false;
      return true;
    });
  }, [className, filters.className, filters.keyword, filters.major, keyword, major, volunteers]);
  const effectiveDate = filters.date ? date : todayInShanghai;
  const available = useMemo(() => {
    const selectedDay = filters.time ? dayOfWeekFromDate(effectiveDate) : 0;
    return directoryFiltered.filter((volunteer) => {
      if (!volunteer.schedule) return false;
      if (!filters.time) return true;
      const selectedWeek = teachingWeekForDate(effectiveDate, volunteer.schedule.academicTerm);
      if (selectedWeek < 1 || selectedWeek > 24) return false;
      return !volunteer.schedule.courses.some((course) => {
        const isInClass = course.dayOfWeek === selectedDay && course.startTime <= time && course.endTime > time;
        if (!isInClass) return false;
        return course.weeks.length === 0 || course.weeks.includes(selectedWeek);
      });
    });
  }, [directoryFiltered, effectiveDate, filters.time, time]);

  useEffect(() => setPage(1), [className, date, filters, keyword, major, time]);
  const totalPages = Math.max(1, Math.ceil(available.length / pageSize));
  const pageItems = available.slice((page - 1) * pageSize, page * pageSize);
  const referenceWeek = (filters.date || filters.time) && uploaded[0]?.schedule ? teachingWeekForDate(effectiveDate, uploaded[0].schedule!.academicTerm) : 0;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const showDailyTimeline = filters.date && !filters.time;

  function toggleFilter(filter: keyof typeof filters) {
    setFilters((current) => ({ ...current, [filter]: !current[filter] }));
  }

  function clearFilters() {
    setFilters({ date: false, time: false, keyword: false, major: false, className: false });
    setKeyword("");
    setMajor("");
    setClassName("");
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="志愿者总数" value={volunteers.length} />
        <StatCard label="已录入课表" value={uploaded.length} />
        <StatCard label="尚未录入" value={volunteers.length - uploaded.length} />
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <div className="rounded-[10px] bg-[#0071e3]/10 p-2.5 text-[#0071e3]"><Clock3 size={20} /></div>
          <div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-950">条件查找志愿者</h2><p className="mt-1 text-sm text-slate-500">按需选择一个或多个条件；不选择条件时显示所有已录入课表的志愿者。</p></div>
          {activeFilterCount > 0 ? <button className="text-sm font-medium text-[#0066cc] hover:text-[#004f9e]" onClick={clearFilters} type="button">清除条件</button> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="选择筛选条件">
          <FilterToggle active={filters.date} label="日期" onClick={() => toggleFilter("date")} />
          <FilterToggle active={filters.time} label="时间点" onClick={() => toggleFilter("time")} />
          <FilterToggle active={filters.keyword} label="姓名或学号" onClick={() => toggleFilter("keyword")} />
          <FilterToggle active={filters.major} label="专业" onClick={() => toggleFilter("major")} />
          <FilterToggle active={filters.className} label="班级" onClick={() => toggleFilter("className")} />
        </div>
        {activeFilterCount > 0 ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filters.date ? <Field label="日期"><input aria-label="选择日期" className="h-11 w-full rounded-[10px] border border-black/[0.12] bg-white px-3 text-sm" onChange={(event) => setDate(event.currentTarget.value)} onInput={(event) => setDate(event.currentTarget.value)} type="date" value={date} /></Field> : null}
          {filters.time ? <Field label="时间点"><input aria-label="选择时间点" className="h-11 w-full rounded-[10px] border border-black/[0.12] bg-white px-3 text-sm" onChange={(event) => setTime(event.currentTarget.value)} onInput={(event) => setTime(event.currentTarget.value)} type="time" value={time} /></Field> : null}
          {filters.keyword ? <Field label="姓名或学号"><div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><input aria-label="搜索姓名或学号" className="h-11 w-full rounded-[10px] border border-black/[0.12] bg-white pl-10 pr-3 text-sm" onChange={(event) => setKeyword(event.target.value)} placeholder="输入姓名或学号" value={keyword} /></div></Field> : null}
          {filters.major ? <Field label="专业"><select aria-label="选择专业" className="h-11 w-full rounded-[10px] border border-black/[0.12] bg-white px-3 text-sm" onChange={(event) => setMajor(event.target.value)} value={major}><option value="">全部专业</option>{majorOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field> : null}
          {filters.className ? <Field label="班级"><select aria-label="选择班级" className="h-11 w-full rounded-[10px] border border-black/[0.12] bg-white px-3 text-sm" onChange={(event) => setClassName(event.target.value)} value={className}><option value="">全部班级</option>{classOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field> : null}
        </div> : null}
        {filters.date && !filters.time ? <p className="mt-4 text-xs text-slate-500">仅选择日期时，将显示所有志愿者当天的空闲与上课时间线。</p> : filters.time ? <p className="mt-4 text-xs text-slate-500">{filters.date ? "系统将按所选日期和时间点判断空闲状态。" : "未选择日期，系统将按今天和所选时间点判断空闲状态。"}</p> : null}
      </Card>

      {showDailyTimeline ? <DailyScheduleTimeline date={date} volunteers={directoryFiltered} /> : <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.07] px-5 py-4">
          <div><h2 className="font-semibold text-slate-950">{activeFilterCount > 0 ? "筛选结果" : "已录入课表的志愿者"}</h2><p className="mt-1 text-xs text-slate-500">{filters.time ? `${effectiveDate} ${time}${referenceWeek > 0 && referenceWeek <= 24 ? ` · 第 ${referenceWeek} 周` : " · 不在当前课表教学周内"}` : activeFilterCount > 0 ? `已启用 ${activeFilterCount} 个筛选条件` : "点击右侧按钮可查看每位志愿者的完整课表"}</p></div>
          <span className="rounded-full bg-[#34c759]/10 px-3 py-1 text-sm font-semibold text-[#248a3d]">{filters.time ? `${available.length} 人有空` : `${available.length} 人`}</span>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {pageItems.map((volunteer) => <article className="rounded-[14px] border border-black/[0.07] bg-white/90 p-4" key={volunteer.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{volunteer.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{volunteer.studentId} · {volunteer.major} · {volunteer.className}</p></div><span className="shrink-0 rounded-full bg-black/[0.045] px-2.5 py-1 text-[11px] text-slate-600">{volunteer.schedule?.academicTerm}</span></div><p className="mt-3 text-xs text-slate-500">联系电话：{volunteer.phone}</p><Button className="mt-3 w-full" href={`/admin/schedules/${volunteer.id}`} variant="secondary">查看课表</Button></article>)}
          {pageItems.length === 0 ? <div className="py-12 text-center"><CalendarX2 className="mx-auto mb-2 text-slate-300" size={32} /><p className="text-sm font-medium text-slate-600">当前条件下没有找到符合条件的人员</p></div> : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-black/[0.07] text-sm">
            <thead className="bg-slate-50/80"><tr>{["志愿者", "专业班级", "联系电话", "课表学期", "操作"].map((label) => <th className="whitespace-nowrap px-5 py-3 text-left font-medium text-slate-500" key={label}>{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-black/[0.07]">
              {pageItems.map((volunteer) => <tr className="hover:bg-black/[0.025]" key={volunteer.id}>
                <td className="px-5 py-4"><p className="font-semibold text-slate-900">{volunteer.name}</p><p className="mt-0.5 text-xs text-slate-500">{volunteer.studentId}</p></td>
                <td className="px-5 py-4"><p className="text-slate-700">{volunteer.major}</p><p className="mt-0.5 text-xs text-slate-500">{volunteer.className}</p></td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{volunteer.phone}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{volunteer.schedule?.academicTerm}</td>
                <td className="px-5 py-4"><Button href={`/admin/schedules/${volunteer.id}`} variant="secondary">查看课表</Button></td>
              </tr>)}
              {pageItems.length === 0 ? <tr><td className="px-5 py-14 text-center" colSpan={5}><CalendarX2 className="mx-auto mb-2 text-slate-300" size={32} /><p className="text-sm font-medium text-slate-600">当前条件下没有找到符合条件的人员</p><p className="mt-1 text-xs text-slate-400">未上传课表的志愿者不会出现在筛选结果中。</p></td></tr> : null}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? <div className="flex items-center justify-between border-t border-black/[0.07] px-5 py-3"><p className="text-xs text-slate-500">第 {page}/{totalPages} 页，每页 {pageSize} 人</p><div className="flex gap-2"><button aria-label="上一页" className="grid size-9 place-items-center rounded-[9px] bg-black/[0.045] text-slate-600 disabled:opacity-35" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={17} /></button><button aria-label="下一页" className="grid size-9 place-items-center rounded-[9px] bg-black/[0.045] text-slate-600 disabled:opacity-35" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight size={17} /></button></div></div> : null}
      </Card>}

      {missing.length > 0 ? <Card>
        <div className="flex items-start gap-3"><CalendarCheck2 className="mt-0.5 text-amber-500" size={21} /><div><h2 className="font-semibold text-slate-900">尚未录入课表（{missing.length} 人）</h2><p className="mt-1 text-sm text-slate-500">以下人员还没有上传课表，因此不会参与空闲时间筛选。</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {missing.map((volunteer) => <div className="flex items-center gap-3 rounded-[12px] border border-black/[0.07] bg-black/[0.018] px-4 py-3" key={volunteer.id}><div className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600"><UsersRound size={17} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{volunteer.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{volunteer.studentId} · {[volunteer.major, volunteer.className].filter((value) => value !== "-").join(" · ") || "资料待完善"}</p></div></div>)}
        </div>
      </Card> : null}
    </div>
  );
}

const timelineStart = 7 * 60 + 30;
const timelineEnd = 22 * 60 + 30;
const timelineDuration = timelineEnd - timelineStart;
const timelineTicks = [8, 10, 12, 14, 16, 18, 20, 22].map((hour) => ({ label: `${String(hour).padStart(2, "0")}:00`, minute: hour * 60 }));

function DailyScheduleTimeline({ date, volunteers }: { date: string; volunteers: VolunteerScheduleRow[] }) {
  const recordedCount = volunteers.filter((volunteer) => volunteer.schedule).length;
  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.07] px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-950">{date} 志愿者时间线</h2>
          <p className="mt-1 text-xs text-slate-500">共 {volunteers.length} 人，其中 {recordedCount} 人已录入课表；移动光标或点按时间线可查看准确时间。</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600" aria-label="时间线图例">
          <Legend color="bg-[#34c759]" label="空闲" />
          <Legend color="bg-[#ff3b30]" label="上课" />
          <Legend color="bg-[#ffcc00]" label="课间不超过 60 分钟" />
          <Legend color="bg-slate-300" label="未录入" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-0 px-3 pb-4 pt-4 sm:min-w-[980px] sm:px-5 sm:pb-5">
          <div className="grid grid-cols-1 items-end gap-1 pb-2 sm:grid-cols-[180px_minmax(760px,1fr)] sm:gap-4">
            <p className="hidden text-xs font-medium text-slate-500 sm:block">志愿者</p>
            <div className="relative h-6" aria-hidden="true">
              {timelineTicks.map((tick) => <span className="absolute top-0 -translate-x-1/2 text-[11px] tabular-nums text-slate-500" key={tick.minute} style={{ left: `${minuteToPercent(tick.minute)}%` }}>{tick.label}</span>)}
            </div>
          </div>
          <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
            {volunteers.map((volunteer) => <VolunteerTimelineRow date={date} key={volunteer.id} volunteer={volunteer} />)}
          </div>
          {volunteers.length === 0 ? <div className="grid min-h-40 place-items-center text-sm text-slate-500">当前其他筛选条件下没有志愿者</div> : null}
        </div>
      </div>
    </Card>
  );
}

function VolunteerTimelineRow({ date, volunteer }: { date: string; volunteer: VolunteerScheduleRow }) {
  const [hoverMinute, setHoverMinute] = useState<number | null>(null);
  const intervals = useMemo(() => volunteer.schedule ? buildDailyIntervals(volunteer.schedule, date) : null, [date, volunteer.schedule]);
  const hoverStatus = hoverMinute === null || !intervals ? "" : intervals.busy.some((interval) => hoverMinute >= interval.start && hoverMinute < interval.end) ? "上课" : intervals.shortBreaks.some((interval) => hoverMinute >= interval.start && hoverMinute < interval.end) ? "短课间" : "空闲";

  function updateHover(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    // 光标横向比例换算成分钟，鼠标走到哪，时间牌就报到哪。
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setHoverMinute(Math.round(timelineStart + ratio * timelineDuration));
  }

  return (
    <div className="grid grid-cols-1 items-center gap-2 py-3 sm:grid-cols-[180px_minmax(760px,1fr)] sm:gap-4">
      <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block">
        <p className="truncate text-sm font-semibold text-slate-900">{volunteer.name}</p>
        <p className="shrink-0 truncate text-[11px] text-slate-500 sm:mt-0.5">{volunteer.studentId} · {volunteer.className}</p>
      </div>
      {intervals ? (
        <div
          aria-label={`${volunteer.name} 当日时间线，绿色空闲，红色上课，黄色为不超过六十分钟的课间`}
          className="relative h-9 cursor-crosshair overflow-visible rounded-[9px] bg-[#34c759]/75 shadow-inner outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#0071e3]"
          onPointerEnter={updateHover}
          onPointerDown={updateHover}
          onPointerLeave={() => setHoverMinute(null)}
          onPointerMove={updateHover}
          role="img"
          tabIndex={0}
        >
          {intervals.shortBreaks.map((interval, index) => <TimelineSegment className="bg-[#ffcc00]/90" interval={interval} key={`break-${index}`} />)}
          {intervals.busy.map((interval, index) => <TimelineSegment className="bg-[#ff3b30]/85" interval={interval} key={`busy-${index}`} />)}
          {timelineTicks.map((tick) => <span className="pointer-events-none absolute inset-y-0 w-px bg-black/10" key={tick.minute} style={{ left: `${minuteToPercent(tick.minute)}%` }} />)}
          {hoverMinute !== null ? <>
            <span className="pointer-events-none absolute -bottom-1 -top-1 z-20 w-px bg-slate-950/80" style={{ left: `${minuteToPercent(hoverMinute)}%` }} />
            <span className={`pointer-events-none absolute bottom-[calc(100%+8px)] z-30 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white shadow-lg ${tooltipPositionClass(hoverMinute)}`} style={{ left: `${minuteToPercent(hoverMinute)}%` }}>{formatMinute(hoverMinute)} · {hoverStatus}</span>
          </> : null}
        </div>
      ) : <div className="relative grid h-9 place-items-center overflow-hidden rounded-[9px] bg-slate-200/80 text-xs font-medium text-slate-500"><span className="relative z-10">未录入课表</span>{timelineTicks.map((tick) => <span className="pointer-events-none absolute inset-y-0 w-px bg-black/10" key={tick.minute} style={{ left: `${minuteToPercent(tick.minute)}%` }} />)}</div>}
    </div>
  );
}

function TimelineSegment({ className, interval }: { className: string; interval: TimeInterval }) {
  return <span className={`pointer-events-none absolute inset-y-0 ${className}`} style={{ left: `${minuteToPercent(interval.start)}%`, width: `${((interval.end - interval.start) / timelineDuration) * 100}%` }} />;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${color}`} />{label}</span>;
}

type TimeInterval = { start: number; end: number };

function buildDailyIntervals(schedule: ScheduleData, date: string) {
  const selectedDay = dayOfWeekFromDate(date);
  const selectedWeek = teachingWeekForDate(date, schedule.academicTerm);
  // 先按日期和教学周筛课，再把课程裁进可视时间轴，凌晨的世界这里暂不营业。
  const raw = schedule.courses
    .filter((course) => course.dayOfWeek === selectedDay && (course.weeks.length === 0 || course.weeks.includes(selectedWeek)))
    .map((course) => ({ start: Math.max(timelineStart, timeToMinute(course.startTime)), end: Math.min(timelineEnd, timeToMinute(course.endTime)) }))
    .filter((interval) => interval.end > interval.start)
    .sort((first, second) => first.start - second.start || first.end - second.end);
  const busy: TimeInterval[] = [];
  raw.forEach((interval) => {
    const previous = busy.at(-1);
    if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end);
    else busy.push({ ...interval });
  });
  const shortBreaks: TimeInterval[] = [];
  for (let index = 1; index < busy.length; index += 1) {
    const gap = busy[index].start - busy[index - 1].end;
    if (gap > 0 && gap <= 60) shortBreaks.push({ start: busy[index - 1].end, end: busy[index].start });
  }
  return { busy, shortBreaks };
}

function timeToMinute(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minuteToPercent(minute: number) {
  return ((Math.max(timelineStart, Math.min(timelineEnd, minute)) - timelineStart) / timelineDuration) * 100;
}

function formatMinute(minute: number) {
  const hour = Math.floor(minute / 60);
  return `${String(hour).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function tooltipPositionClass(minute: number) {
  const percent = minuteToPercent(minute);
  if (percent < 12) return "translate-x-0";
  if (percent > 88) return "-translate-x-full";
  return "-translate-x-1/2";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-700">{label}{children}</label>;
}

function FilterToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button aria-pressed={active} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm" : "border-black/[0.1] bg-white text-slate-600 hover:border-[#0071e3]/35 hover:bg-[#0071e3]/[0.045] hover:text-[#0066cc]"}`} onClick={onClick} type="button">{active ? "✓ " : "+ "}{label}</button>;
}

function dayOfWeekFromDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekDay === 0 ? 7 : weekDay;
}

function teachingWeekForDate(date: string, academicTerm: string) {
  const startDate = knownTermStarts[academicTerm] ?? inferTermStart(academicTerm);
  if (!startDate) return 0;
  const difference = dateKeyToUtc(date) - dateKeyToUtc(startDate);
  return Math.floor(difference / 86_400_000 / 7) + 1;
}

function inferTermStart(academicTerm: string) {
  const match = academicTerm.match(/^(\d{4})-(\d{4})-([12])$/);
  if (!match) return "";
  const startYear = Number(match[1]);
  return match[3] === "1" ? firstMondayOnOrAfter(startYear, 8, 25) : firstMondayOnOrAfter(Number(match[2]), 2, 20);
}

function firstMondayOnOrAfter(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  const offset = (8 - candidate.getUTCDay()) % 7;
  candidate.setUTCDate(candidate.getUTCDate() + offset);
  return candidate.toISOString().slice(0, 10);
}

function dateKeyToUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
