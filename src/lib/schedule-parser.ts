/** 项目导读：学校课表解析器：把表格里的课程、周次和钟点拆成结构化数据；面对合并单元格也要保持成年人情绪稳定。 */
import * as XLSX from "xlsx";
import { scheduleDays, type ScheduleCourseData, type ScheduleData } from "@/types/schedule";

type CellValue = string | number | boolean | null | undefined;

export function parseScheduleWorkbook(buffer: Buffer, sourceFileName: string, fileSize: number): ScheduleData {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, dense: false });
  const sheetName = workbook.SheetNames[0];
  const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined;

  if (!worksheet) throw new Error("课表文件中没有可读取的工作表");

  const rows = XLSX.utils.sheet_to_json<CellValue[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true
  });
  // 不迷信固定行号：学校表格偶尔爱在表头前加戏，认出五个星期列才算找到组织。
  const headerRowIndex = rows.findIndex((row) => scheduleDays.filter((day) => row.some((cell) => normalizeCell(cell) === day)).length >= 5);

  if (headerRowIndex < 0) throw new Error("未识别到星期一至星期日，请上传学校导出的学生个人课表");

  const dayColumns = new Map<number, number>();
  rows[headerRowIndex].forEach((cell, columnIndex) => {
    const dayIndex = scheduleDays.indexOf(normalizeCell(cell));
    if (dayIndex >= 0) dayColumns.set(columnIndex, dayIndex + 1);
  });

  if (dayColumns.size < 5) throw new Error("课表星期列不完整，请重新从学校系统导出后上传");

  const merges = worksheet["!merges"] ?? [];
  const courses: ScheduleCourseData[] = [];
  let timeRowCount = 0;

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const rowTime = parseTimeRange(normalizeCell(rows[rowIndex]?.[0]));
    if (!rowTime) continue;
    timeRowCount += 1;

    for (const [columnIndex, dayOfWeek] of dayColumns.entries()) {
      const originalText = normalizeMultiline(rows[rowIndex]?.[columnIndex]);
      if (!originalText) continue;

      // 合并单元格代表课程横跨多节，结束时间得去最后一行拿，不能看第一眼就下结论。
      const merge = merges.find((item) => item.s.r === rowIndex && item.s.c === columnIndex);
      const endRowIndex = merge?.e.r ?? rowIndex;
      const endRowTime = parseTimeRange(normalizeCell(rows[endRowIndex]?.[0])) ?? rowTime;
      const entries = splitCourseEntries(originalText);

      entries.forEach((entry) => {
        courses.push({
          dayOfWeek,
          startTime: rowTime.startTime,
          endTime: endRowTime.endTime,
          courseName: entry.courseName,
          details: entry.details,
          weeks: parseWeeks(entry.details),
          originalText: entry.originalText
        });
      });
    }
  }

  if (timeRowCount < 4) throw new Error("未识别到完整的上课时段，请确认文件没有被修改");

  const metadataText = rows.slice(0, headerRowIndex).flat().map(normalizeCell).filter(Boolean).join(" ");
  return {
    academicTerm: extractMetadata(metadataText, "学年学期", ["班级", "专业", "院系", "打印日期"]) || "未识别学期",
    className: extractMetadata(metadataText, "班级", ["专业", "院系", "打印日期"]),
    major: extractMetadata(metadataText, "专业", ["院系", "打印日期"]),
    department: extractMetadata(metadataText, "院系", ["打印日期"]),
    sourceFileName,
    fileSize,
    courses
  };
}

function normalizeCell(value: CellValue) {
  return String(value ?? "").replace(/\u00a0/g, " ").trim();
}

function normalizeMultiline(value: CellValue) {
  return normalizeCell(value).replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function parseTimeRange(value: string) {
  const match = value.match(/(\d{1,2}):(\d{2})\s*[~～—–-]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return { startTime: `${match[1].padStart(2, "0")}:${match[2]}`, endTime: `${match[3].padStart(2, "0")}:${match[4]}` };
}

function splitCourseEntries(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const entries: Array<{ courseName: string; details: string; originalText: string }> = [];

  for (let index = 0; index < lines.length;) {
    const courseName = lines[index];
    const detailLines: string[] = [];
    index += 1;

    while (index < lines.length) {
      const line = lines[index];
      if (detailLines.length > 0 && !line.includes(";") && !line.includes("；") && !/[周星期]/.test(line)) break;
      detailLines.push(line);
      index += 1;
      if (/[周星期]/.test(line) && /[;；]/.test(line)) break;
    }

    if (detailLines.length === 0 && index < lines.length) {
      detailLines.push(lines[index]);
      index += 1;
    }

    const details = detailLines.join("\n");
    entries.push({ courseName, details, originalText: [courseName, details].filter(Boolean).join("\n") });
  }

  return entries.length > 0 ? entries : [{ courseName: text.split("\n")[0] || "未命名课程", details: text, originalText: text }];
}

export function parseWeeks(value: string) {
  const weekMatch = value.match(/([0-9,，、\-—–至]+)\s*周/);
  if (!weekMatch) return [];

  const weeks = new Set<number>();
  // “1-4、6、8-10周”统一摊平成数字，后面查某天上不上课就不用现场做奥数。
  weekMatch[1].replace(/[，、]/g, ",").split(",").forEach((part) => {
    const range = part.trim().match(/^(\d{1,2})\s*(?:-|—|–|至)\s*(\d{1,2})$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let week = Math.min(start, end); week <= Math.max(start, end) && week <= 30; week += 1) weeks.add(week);
      return;
    }
    const week = Number(part.trim());
    if (week >= 1 && week <= 30) weeks.add(week);
  });
  return Array.from(weeks).sort((first, second) => first - second);
}

function extractMetadata(text: string, label: string, followingLabels: string[]) {
  const lookahead = followingLabels.map(escapeRegExp).join("|");
  const pattern = new RegExp(`${escapeRegExp(label)}[：:]\\s*(.*?)(?=\\s+(?:${lookahead})[：:]|$)`);
  return text.match(pattern)?.[1]?.trim() ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
