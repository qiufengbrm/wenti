/** 项目导读：管理员首页贡献热力图，把全体志愿者近一年的有效服务时长按日、按周铺开。 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";

type ContributionDay = {
  date: string;
  hours: number;
  volunteerCount: number;
  recordCount: number;
  isFuture: boolean;
};

type ContributionCalendar = {
  days: ContributionDay[];
  totalHours: number;
  activeDays: number;
  peakHours: number;
  peakDate: string | null;
};

type ViewMode = "daily" | "weekly";

const WEEKDAY_LABELS = ["", "一", "", "三", "", "五", ""];
const LEVEL_CLASSES = [
  "bg-[var(--heatmap-level-0)]",
  "bg-[var(--heatmap-level-1)]",
  "bg-[var(--heatmap-level-2)]",
  "bg-[var(--heatmap-level-3)]",
  "bg-[var(--heatmap-level-4)]"
];
const GRID_COLUMNS = { gridTemplateColumns: "repeat(53, minmax(10px, 1fr))", gap: "clamp(3px, .32vw, 6px)" };

export function VolunteerContributionHeatmap({
  calendar,
  title = "志愿贡献",
  description = "过去一年全体志愿者已通过的服务时长"
}: {
  calendar: ContributionCalendar;
  title?: string;
  description?: string;
}) {
  const [mode, setMode] = useState<ViewMode>("daily");
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const weeks = useMemo(() => chunk(calendar.days, 7).map((days) => ({
    days,
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
    hours: sum(days.map((day) => day.isFuture ? 0 : day.hours)),
    recordCount: sum(days.map((day) => day.isFuture ? 0 : day.recordCount)),
    isFuture: days.every((day) => day.isFuture)
  })), [calendar.days]);
  const peakWeekHours = Math.max(0, ...weeks.map((week) => week.hours));
  const peakDayText = calendar.peakDate ? `${formatDate(calendar.peakDate)} · ${formatHours(calendar.peakHours)} 小时` : "暂无贡献记录";
  const [detail, setDetail] = useState(peakDayText);
  const monthLabels = getMonthLabels(weeks.map((week) => week.days));

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
  }, [mode, calendar.days.length]);

  function changeMode(nextMode: ViewMode) {
    setMode(nextMode);
    setDetail(nextMode === "daily" ? peakDayText : formatPeakWeek(weeks));
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-5 px-5 pb-4 pt-5 sm:px-6 sm:pt-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#1d1d1f]">{title}</h2>
          <p className="mt-1 text-sm text-[#86868b]">{description}</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:justify-end">
          <div className="grid grid-cols-3 gap-x-7 sm:text-right">
            <Metric label="贡献时长" value={`${formatHours(calendar.totalHours)}h`} />
            <Metric label="活跃天数" value={`${calendar.activeDays} 天`} />
            <Metric label="单日峰值" value={`${formatHours(calendar.peakHours)}h`} />
          </div>
          <div className="inline-flex w-fit rounded-[10px] bg-black/[0.045] p-1" aria-label="选择贡献统计粒度" role="tablist">
            <ViewTab active={mode === "daily"} label="每日" onClick={() => changeMode("daily")} />
            <ViewTab active={mode === "weekly"} label="每周" onClick={() => changeMode("weekly")} />
          </div>
        </div>
      </div>

      <div className="border-t border-black/[0.06] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="overflow-x-auto pb-1" ref={scrollViewportRef}>
          <div className="min-w-[820px]">
            <MonthLabels labels={monthLabels} />
            {mode === "daily" ? (
              <DailyGrid calendar={calendar} onDetail={setDetail} />
            ) : (
              <WeeklyGrid peakHours={peakWeekHours} weeks={weeks} onDetail={setDetail} />
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-[#86868b] sm:flex-row sm:items-center sm:justify-between">
          <span className="min-h-5 tabular-nums">{detail}</span>
          {mode === "daily" ? (
            <div className="flex items-center gap-1.5" aria-label="颜色越深，志愿时长越多">
              <span className="mr-1">少</span>
              {LEVEL_CLASSES.map((className, index) => <span className={`size-3.5 rounded-[4px] ${className}`} key={index} />)}
              <span className="ml-1">多</span>
            </div>
          ) : (
            <span>点亮格数越多，该周志愿时长越高</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function DailyGrid({ calendar, onDetail }: { calendar: ContributionCalendar; onDetail: (value: string) => void }) {
  return (
    <div className="flex gap-2.5">
      <div className="grid w-5 shrink-0 grid-rows-[repeat(7,minmax(10px,1fr))] gap-[clamp(3px,.32vw,6px)] text-[10px] leading-none text-[#86868b]" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, index) => <span className="flex items-center" key={`${label}-${index}`}>{label}</span>)}
      </div>
      <div className="grid flex-1 grid-flow-col grid-rows-[repeat(7,minmax(0,1fr))]" style={GRID_COLUMNS} role="grid" aria-label="过去一年每日志愿服务贡献热力图">
        {calendar.days.map((day) => {
          const level = contributionLevel(day.hours, calendar.peakHours);
          const label = `${formatDate(day.date)} · ${formatHours(day.hours)} 小时 · ${day.volunteerCount} 人 · ${day.recordCount} 条记录`;
          return (
            <span
              aria-label={label}
              className={`aspect-square min-w-0 rounded-[5px] ${LEVEL_CLASSES[level]} transition-[transform,filter] duration-150 hover:scale-110 hover:brightness-110 ${day.isFuture ? "invisible" : "cursor-default"}`}
              key={day.date}
              onClick={() => !day.isFuture && onDetail(label)}
              onMouseEnter={() => !day.isFuture && onDetail(label)}
              role="gridcell"
              title={label}
            />
          );
        })}
      </div>
    </div>
  );
}

function WeeklyGrid({ weeks, peakHours, onDetail }: {
  weeks: Array<{ startDate: string; endDate: string; hours: number; recordCount: number; isFuture: boolean }>;
  peakHours: number;
  onDetail: (value: string) => void;
}) {
  return (
    <div className="flex gap-2.5">
      <div className="grid w-5 shrink-0 grid-rows-[repeat(7,minmax(10px,1fr))] gap-[clamp(3px,.32vw,6px)]" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <span key={index} />)}
      </div>
      <div className="grid flex-1 grid-flow-col grid-rows-[repeat(7,minmax(0,1fr))]" style={GRID_COLUMNS} role="grid" aria-label="过去一年每周志愿服务贡献热力图">
        {weeks.flatMap((week) => {
          const label = `${formatDateRange(week.startDate, week.endDate)} · ${formatHours(week.hours)} 小时 · ${week.recordCount} 条记录`;
          const filledCells = week.hours > 0 && peakHours > 0 ? Math.max(1, Math.ceil((week.hours / peakHours) * 7)) : 0;
          return Array.from({ length: 7 }, (_, rowIndex) => {
            const isFilled = rowIndex >= 7 - filledCells;
            return (
              <span
                aria-label={rowIndex === 0 ? label : undefined}
                className={`aspect-square min-w-0 rounded-[5px] ${isFilled ? LEVEL_CLASSES[4] : LEVEL_CLASSES[0]} transition-[transform,filter] duration-150 hover:scale-110 hover:brightness-110 ${week.isFuture ? "invisible" : "cursor-default"}`}
                key={`${week.startDate}-${rowIndex}`}
                onClick={() => !week.isFuture && onDetail(label)}
                onMouseEnter={() => !week.isFuture && onDetail(label)}
                role="gridcell"
                title={label}
              />
            );
          });
        })}
      </div>
    </div>
  );
}

function MonthLabels({ labels }: { labels: string[] }) {
  return (
    <div className="mb-2.5 ml-[30px] grid text-[11px] leading-none text-[#86868b]" style={GRID_COLUMNS} aria-hidden="true">
      {labels.map((label, index) => <span className="whitespace-nowrap" key={`${label}-${index}`}>{label}</span>)}
    </div>
  );
}

function ViewTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-selected={active}
      className={`rounded-[7px] px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 ${active ? "bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,.12)]" : "text-[#86868b] hover:text-[#1d1d1f]"}`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-base font-semibold tabular-nums text-[#1d1d1f] sm:text-lg">{value}</p><p className="mt-0.5 whitespace-nowrap text-[11px] text-[#86868b]">{label}</p></div>;
}

function getMonthLabels(weeks: ContributionDay[][]) {
  return weeks.map((week, index) => {
    const firstOfMonth = week.find((day) => day.date.endsWith("-01"));
    if (index !== 0 && !firstOfMonth) return "";
    return `${Number((firstOfMonth ?? week[0]).date.slice(5, 7))}月`;
  });
}

function formatPeakWeek(weeks: Array<{ startDate: string; endDate: string; hours: number }>) {
  const peak = weeks.reduce<(typeof weeks)[number] | null>((current, week) => !current || week.hours > current.hours ? week : current, null);
  return peak && peak.hours > 0 ? `峰值周：${formatDateRange(peak.startDate, peak.endDate)} · ${formatHours(peak.hours)} 小时` : "暂无贡献记录";
}

function contributionLevel(hours: number, peakHours: number) {
  if (hours <= 0 || peakHours <= 0) return 0;
  const ratio = hours / peakHours;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function sum(values: number[]) {
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)} 月 ${Number(day)} 日`;
}

function formatDateRange(start: string, end: string) {
  return `${formatDate(start)}–${formatDate(end)}`;
}

function chunk<T>(values: T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, index * size + size));
}
