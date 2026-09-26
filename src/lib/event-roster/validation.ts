/** 项目导读：赛事字段和重复项规则检查；只提醒、不擅自删除，把最后决定留给人。 */
import type { EventIssue, RosterEvent } from "@/types/event-roster";

const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateRosterEvents(events: RosterEvent[]): EventIssue[] {
  const issues: EventIssue[] = [];
  const duplicateKeys = new Map<string, string[]>();

  for (const item of events) {
    if (!item.date) issues.push(issue(item.id, "missing-date", "日期待确认"));
    else if (!isValidDate(item.date)) issues.push(issue(item.id, "invalid-date", "日期格式无效"));
    if (!item.time) issues.push(issue(item.id, "missing-time", "时间待确认"));
    else if (!timePattern.test(item.time)) issues.push(issue(item.id, "invalid-time", "时间格式无效"));
    if (!item.event.trim()) issues.push(issue(item.id, "missing-event", "比赛项目不能为空"));
    if (item.confidence === "low") issues.push(issue(item.id, "low-confidence", "识别置信度较低"));

    if (item.date && item.time && item.event.trim()) {
      const key = `${item.date}|${item.time}|${item.event.trim().toLocaleLowerCase("zh-CN")}`;
      duplicateKeys.set(key, [...(duplicateKeys.get(key) ?? []), item.id]);
    }
  }

  for (const ids of duplicateKeys.values()) {
    if (ids.length > 1) ids.forEach((id) => issues.push(issue(id, "duplicate", "疑似重复赛事，请人工确认")));
  }
  return issues;
}

export function canGroupEvents(events: RosterEvent[]) {
  return !validateRosterEvents(events).some((item) => ["missing-date", "invalid-date", "missing-time", "invalid-time", "missing-event"].includes(item.kind));
}

function isValidDate(value: string) {
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function issue(eventId: string, kind: EventIssue["kind"], message: string): EventIssue {
  return { eventId, kind, message };
}
