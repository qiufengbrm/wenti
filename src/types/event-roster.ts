/** 项目导读：赛事排班表工具的共享业务类型；前后端说同一种话，核对和导出才不会各自发挥。 */

export type EventConfidence = "high" | "medium" | "low";

export interface RosterEvent {
  id: string;
  date: string | null;
  time: string | null;
  event: string;
  stage: string | null;
  location: string | null;
  sourceFile: string;
  sourcePage: number;
  sourceText: string;
  confidence: EventConfidence;
}

export interface EventIssue {
  eventId: string;
  kind: "invalid-date" | "invalid-time" | "missing-date" | "missing-time" | "missing-event" | "duplicate" | "low-confidence";
  message: string;
}

export interface ScheduleGroup {
  id: string;
  date: string | null;
  name: string;
  startTime: string | null;
  eventIds: string[];
}
