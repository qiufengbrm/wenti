"use client";

import { scheduleDays } from "@/types/schedule";

export type RosterPerson = { id: string; name: string };
export type RosterShift = {
  id: string;
  week: number;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  requiredCount: number;
  assignments: RosterPerson[];
};

type Conflict = { shiftId: string; userId: string; name: string };

type Props = {
  shifts: RosterShift[];
  dates: string[];
  candidates: RosterPerson[];
  conflicts: Conflict[];
  canEdit: boolean;
  busy: boolean;
  onAssign: (shift: RosterShift, index: number, userId: string) => void;
};

function shortDate(value: string) {
  return value.slice(5).replace("-", ".");
}

export function RosterWeekTable({ shifts, dates, candidates, conflicts, canEdit, busy, onAssign }: Props) {
  const timeSlots = Array.from(new Map(shifts.map((shift) => [`${shift.startTime}-${shift.endTime}`, { startTime: shift.startTime, endTime: shift.endTime }])).values())
    .sort((first, second) => first.startTime.localeCompare(second.startTime) || first.endTime.localeCompare(second.endTime));

  function shiftCard(shift: RosterShift) {
    const vacant = shift.requiredCount - shift.assignments.length;
    const shiftConflicts = conflicts.filter((conflict) => conflict.shiftId === shift.id);
    return <article className={`rounded-lg border-l-[3px] px-2 py-2 shadow-sm sm:px-3 sm:py-3 lg:px-1.5 lg:py-2 xl:px-2.5 ${vacant ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950/40" : "border-l-blue-500 bg-blue-50 dark:bg-blue-950/40"}`} key={shift.id}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold tabular-nums tracking-tight text-slate-700 dark:text-slate-200 lg:hidden">{shift.startTime}–{shift.endTime}</span>
        <span className={`shrink-0 text-[10px] font-semibold tabular-nums ${vacant ? "text-amber-700 dark:text-amber-300" : "text-blue-700 dark:text-blue-300"}`}>{shift.assignments.length}/{shift.requiredCount}</span>
      </div>
      <p className="mt-1 break-words text-[11px] leading-4 text-slate-600 dark:text-slate-300 lg:text-[10px] lg:leading-3">{shift.location}</p>
      <div className="mt-2 grid gap-1.5">
        {Array.from({ length: shift.requiredCount }, (_, index) => canEdit ?
          <select
            aria-label={`${shift.date} ${shift.startTime} 第 ${index + 1} 位成员`}
            className="min-w-0 w-full border bg-white px-1.5 py-1 text-xs"
            disabled={busy}
            key={index}
            onChange={(event) => onAssign(shift, index, event.target.value)}
            value={shift.assignments[index]?.id ?? ""}
          >
            <option value="">待分配</option>
            {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
          </select> :
          <span className={`rounded-md border px-2 py-1 text-xs font-semibold leading-5 lg:px-0.5 lg:py-0.5 lg:text-[10px] lg:tracking-tight xl:px-1 xl:text-[11px] ${shift.assignments[index] ? "border-blue-100 bg-white/90 text-slate-900 dark:border-blue-900 dark:bg-slate-900 dark:text-slate-100" : "border-amber-200 bg-white/70 text-amber-800 dark:border-amber-800 dark:bg-slate-900"}`} key={index}>{shift.assignments[index]?.name ?? "待分配"}</span>
        )}
      </div>
      {shiftConflicts.map((conflict) => <p className="mt-2 text-[11px] font-medium leading-4 text-red-700 dark:text-red-300" key={conflict.userId}>{conflict.name} 的课表与此班次冲突，请负责人处理</p>)}
    </article>;
  }

  if (!shifts.length) return <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">这一周没有排班</div>;

  return <>
    <div className="mt-5 grid gap-3 lg:hidden">
      {dates.map((date, dayIndex) => {
        const dayShifts = shifts.filter((shift) => shift.date === date).sort((first, second) => first.startTime.localeCompare(second.startTime));
        return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" key={date}>
          <h3 className="flex items-baseline justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{scheduleDays[dayIndex]}</span>
            <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-300">{shortDate(date)}</span>
          </h3>
          <div className="grid gap-2 p-2.5">{dayShifts.length ? dayShifts.map(shiftCard) : <p className="px-2 py-3 text-xs text-slate-400">无排班</p>}</div>
        </section>;
      })}
    </div>
    <div className="mt-5 hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 lg:block">
      <table className="w-full min-w-[670px] table-fixed border-collapse text-left">
        <colgroup><col style={{ width: 70 }} />{dates.map((date) => <col key={date} />)}</colgroup>
        <thead><tr className="bg-slate-50 dark:bg-slate-800">
          <th className="border-b border-r border-slate-200 px-2 py-3 text-[11px] font-semibold text-slate-500 dark:border-slate-700" scope="col">时间</th>
          {dates.map((date, index) => <th className="border-b border-r border-slate-200 px-1.5 py-3 last:border-r-0 dark:border-slate-700" key={date} scope="col">
            <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 xl:text-sm">{scheduleDays[index]}</span>
            <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-300">{shortDate(date)}</span>
          </th>)}
        </tr></thead>
        <tbody>{timeSlots.map((slot) => <tr key={`${slot.startTime}-${slot.endTime}`}>
          <th className="border-b border-r border-slate-200 bg-slate-50 px-2 py-4 align-top text-[11px] font-semibold tabular-nums text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" scope="row">
            <span className="block">{slot.startTime}</span><span className="mt-1 block text-slate-400">{slot.endTime}</span>
          </th>
          {dates.map((date) => {
            const cellShifts = shifts.filter((shift) => shift.date === date && shift.startTime === slot.startTime && shift.endTime === slot.endTime);
            return <td className="border-b border-r border-slate-200 bg-white p-1 align-top last:border-r-0 dark:border-slate-700 dark:bg-slate-900 xl:p-1.5" key={date}>
              {cellShifts.length ? <div className="grid gap-1.5">{cellShifts.map(shiftCard)}</div> : <span aria-label="无排班" className="block min-h-20" />}
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
