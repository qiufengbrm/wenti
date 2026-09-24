import type { ScheduleCourseData } from "@/types/schedule";

// 智慧教务 xskb_list.do 的 sktime 形如：周一第1、2节{第1-16周}。
const dayNumbers: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
const sectionTimes = [
  ["08:00", "08:45"], ["08:55", "09:40"], ["10:10", "10:55"], ["11:05", "11:50"],
  ["14:00", "14:45"], ["14:55", "15:40"], ["16:10", "16:55"], ["17:05", "17:50"],
  ["18:30", "19:15"], ["19:20", "20:05"], ["20:15", "21:00"], ["21:05", "21:50"]
] as const;

export function parseWeekList(value: string): number[] {
  const parity = /单周/.test(value) ? 1 : /双周/.test(value) ? 0 : null;
  const cleaned = value.replace(/[单双]周/g, "").replace(/周/g, "").replace(/[，、]/g, ",").replace(/[—–至~～]/g, "-");
  const result = new Set<number>();
  for (const part of cleaned.split(",")) {
    const match = part.trim().match(/^(\d{1,2})(?:-(\d{1,2}))?$/);
    if (!match) throw new Error(`无法识别课程周次：${value}`);
    const first = Number(match[1]);
    const last = Number(match[2] ?? match[1]);
    if (first < 1 || last > 30 || last < first) throw new Error(`课程周次超出范围：${value}`);
    for (let week = first; week <= last; week += 1) if (parity === null || week % 2 === parity) result.add(week);
  }
  return [...result].sort((a, b) => a - b);
}

export function parseCcnuCourses(payload: unknown): ScheduleCourseData[] {
  if (!payload || typeof payload !== "object" || !("code" in payload) || payload.code !== 0 || !("data" in payload) || !Array.isArray(payload.data)) {
    throw new Error("智慧教务未返回有效课表，请重新授权");
  }
  const courses: ScheduleCourseData[] = [];
  for (const raw of payload.data) {
    if (!raw || typeof raw !== "object") throw new Error("智慧教务课表格式异常");
    const item = raw as Record<string, unknown>;
    const name = String(item.kc_mc ?? "").trim();
    const descriptions = String(item.sktime ?? "").split(";").map((part) => part.trim()).filter(Boolean);
    const locations = String(item.skddmc ?? "").split(";").map((part) => part.trim());
    if (!name || descriptions.length === 0) throw new Error("智慧教务课程信息不完整");
    for (const [index, description] of descriptions.entries()) {
      const match = description.match(/^周([一二三四五六日天])第([\d、,\-]+)节\{第([^}]+)\}/);
      if (!match) throw new Error(`无法识别课程时段：${description}`);
      const sections = match[2].replace(/、/g, ",").split(",").flatMap((part) => {
        const range = part.match(/^(\d{1,2})-(\d{1,2})$/);
        if (range) return Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, offset) => Number(range[1]) + offset);
        return [Number(part)];
      });
      if (!sections.length || sections.some((section) => !sectionTimes[section - 1])) throw new Error(`课程节次超出范围：${description}`);
      const first = Math.min(...sections);
      const last = Math.max(...sections);
      const weeks = parseWeekList(match[3]);
      courses.push({
        dayOfWeek: dayNumbers[match[1]], startTime: sectionTimes[first - 1][0], endTime: sectionTimes[last - 1][1],
        courseName: name, details: locations[index] ?? "", weeks, originalText: description
      });
    }
  }
  return courses;
}
