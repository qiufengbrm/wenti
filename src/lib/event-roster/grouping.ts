/** 项目导读：把已确认赛事按日期和相邻时间聚成跟进段；这是参考排班时间，不冒充官方赛程。 */
import type { RosterEvent, ScheduleGroup } from "@/types/event-roster";

export interface GroupingOptions {
  maxGapMinutes: number;
}

export function groupRosterEvents(events: RosterEvent[], options: GroupingOptions): ScheduleGroup[] {
  const candidates = [...events].sort((a, b) => `${a.date ?? "9999"} ${a.time ?? "99:99"}`.localeCompare(`${b.date ?? "9999"} ${b.time ?? "99:99"}`, "zh-CN"));
  const groups: ScheduleGroup[] = [];

  for (const item of candidates) {
    const previous = groups.at(-1);
    const itemMinutes = item.time ? toMinutes(item.time) : null;
    const previousEvent = previous ? events.find((event) => event.id === previous.eventIds.at(-1)) : undefined;
    const canJoin = previous && item.date && item.time && previous.date === item.date && previousEvent?.time
      ? itemMinutes! - toMinutes(previousEvent.time) <= options.maxGapMinutes
      : false;

    if (canJoin && previous) {
      previous.eventIds.push(item.id);
    } else {
      groups.push({
        id: makeId(),
        date: item.date,
        name: item.date ? `${formatDate(item.date)}赛事跟进` : `${item.event.trim() || "待确认赛事"}跟进`,
        startTime: item.time,
        eventIds: [item.id]
      });
    }
  }
  return groups;
}

export function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatDate(value: string | null) {
  if (!value) return "日期待确认";
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `group-${Date.now()}-${Math.random()}`;
}
