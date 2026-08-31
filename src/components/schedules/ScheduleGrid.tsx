/** 项目导读：课表组件：把课程和空闲时间变成看得懂的界面；红黄绿各司其职，不在这里表演交通灯蹦迪。 */
import type { CSSProperties } from "react";
import { CalendarDays } from "lucide-react";
import { scheduleDays, scheduleSlots, type ScheduleCourseData } from "@/types/schedule";

const courseColors = [
  "border-blue-300/70 bg-blue-50",
  "border-emerald-300/70 bg-emerald-50",
  "border-violet-300/70 bg-violet-50",
  "border-amber-300/70 bg-amber-50",
  "border-rose-300/70 bg-rose-50",
  "border-cyan-300/70 bg-cyan-50"
];

export function ScheduleGrid({ courses }: { courses: ScheduleCourseData[] }) {
  const groups = groupCourses(courses);

  if (courses.length === 0) {
    return <div className="grid min-h-56 place-items-center rounded-[14px] border border-dashed border-black/15 bg-black/[0.018] text-center text-sm text-slate-500"><div><CalendarDays className="mx-auto mb-3 text-slate-300" size={34} /><p>这份课表没有识别到课程</p></div></div>;
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {scheduleDays.map((day, dayIndex) => {
          const dayCourses = courses.filter((course) => course.dayOfWeek === dayIndex + 1).sort((first, second) => first.startTime.localeCompare(second.startTime));
          if (dayCourses.length === 0) return null;
          return <section className="overflow-hidden rounded-[14px] border border-black/[0.08] bg-white/90" key={day}>
            <h3 className="border-b border-black/[0.06] bg-black/[0.025] px-4 py-3 text-sm font-semibold text-slate-900">{day}</h3>
            <div className="divide-y divide-black/[0.06]">
              {dayCourses.map((course, index) => {
                const color = courseColors[Math.abs(hash(course.courseName)) % courseColors.length];
                return <div className="flex items-start gap-3 p-3.5" key={`${course.courseName}-${course.startTime}-${index}`}>
                  <div className="w-[5.25rem] shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-slate-600"><p>{course.startTime}</p><p className="mt-1 text-slate-400">{course.endTime}</p></div>
                  <div className={`min-w-0 flex-1 rounded-[10px] border p-3 ${color}`}><p className="font-semibold leading-5 text-slate-900">{course.courseName}</p><p className="mt-1.5 text-xs font-medium text-slate-600">{formatCourseWeeks(course.weeks)}</p></div>
                </div>;
              })}
            </div>
          </section>;
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-[14px] border border-black/[0.09] bg-white/70 md:block">
      <div
        className="grid min-w-[1060px] gap-px bg-black/[0.09]"
        style={{ gridTemplateColumns: "112px repeat(7, minmax(132px, 1fr))", gridTemplateRows: "52px repeat(6, 112px)" }}
      >
        <div className="grid place-items-center bg-slate-50 text-xs font-semibold text-slate-500" style={{ gridColumn: 1, gridRow: 1 }}>时段</div>
        {scheduleDays.map((day, index) => <div className="grid place-items-center bg-slate-50 px-2 text-sm font-semibold text-slate-800" key={day} style={{ gridColumn: index + 2, gridRow: 1 }}>{day}</div>)}

        {scheduleSlots.map((slot, rowIndex) => (
          <div className="flex flex-col items-center justify-center bg-slate-50 px-2 text-center" key={slot.startTime} style={{ gridColumn: 1, gridRow: rowIndex + 2 }}>
            <span className="text-xs font-semibold text-slate-700">{slot.label}</span>
            <span className="mt-1 text-[11px] text-slate-400">{slot.sections}</span>
            <span className="mt-1 text-[11px] font-medium tabular-nums text-slate-500">{slot.startTime}–{slot.endTime}</span>
          </div>
        ))}

        {scheduleDays.flatMap((day, dayIndex) => scheduleSlots.map((slot, rowIndex) => (
          <div className="bg-white/90" key={`${day}-${slot.startTime}`} style={{ gridColumn: dayIndex + 2, gridRow: rowIndex + 2 }} />
        )))}

        {groups.map((group) => {
          const startIndex = findStartSlot(group.startTime);
          const endIndex = findEndSlot(group.endTime);
          if (startIndex < 0 || endIndex < startIndex) return null;
          const style: CSSProperties = { gridColumn: group.dayOfWeek + 1, gridRow: `${startIndex + 2} / ${endIndex + 3}` };
          const color = courseColors[Math.abs(hash(group.entries[0].courseName)) % courseColors.length];
          return (
            <div className={`z-10 m-1.5 overflow-auto rounded-[10px] border p-2.5 text-slate-900 shadow-sm ${color}`} key={group.key} style={style}>
              {group.entries.map((course, index) => (
                <div className={index > 0 ? "mt-2 border-t border-current/15 pt-2" : ""} key={`${course.courseName}-${index}`}>
                  <p className="text-[12px] font-semibold leading-4">{course.courseName}</p>
                  <p className="mt-1.5 text-[10px] font-medium leading-4 opacity-65">{formatCourseWeeks(course.weeks)}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
}

function formatCourseWeeks(weeks: number[]) {
  if (weeks.length === 0) return "周次未标注";
  const values = Array.from(new Set(weeks)).sort((first, second) => first - second);
  const ranges: string[] = [];
  let start = values[0];
  let end = values[0];

  for (let index = 1; index <= values.length; index += 1) {
    const value = values[index];
    if (value === end + 1) {
      end = value;
      continue;
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`);
    start = value;
    end = value;
  }
  return `第 ${ranges.join("、")} 周`;
}

function groupCourses(courses: ScheduleCourseData[]) {
  const groups = new Map<string, { key: string; dayOfWeek: number; startTime: string; endTime: string; entries: ScheduleCourseData[] }>();
  courses.forEach((course) => {
    const key = `${course.dayOfWeek}-${course.startTime}-${course.endTime}`;
    const current = groups.get(key);
    if (current) current.entries.push(course);
    else groups.set(key, { key, dayOfWeek: course.dayOfWeek, startTime: course.startTime, endTime: course.endTime, entries: [course] });
  });
  return Array.from(groups.values());
}

function findStartSlot(time: string) {
  const exact = scheduleSlots.findIndex((slot) => slot.startTime === time);
  return exact >= 0 ? exact : scheduleSlots.findIndex((slot) => slot.endTime > time);
}

function findEndSlot(time: string) {
  const exact = scheduleSlots.findIndex((slot) => slot.endTime === time);
  if (exact >= 0) return exact;
  for (let index = scheduleSlots.length - 1; index >= 0; index -= 1) if (scheduleSlots[index].startTime < time) return index;
  return -1;
}

function hash(value: string) {
  return Array.from(value).reduce((total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0, 0);
}
