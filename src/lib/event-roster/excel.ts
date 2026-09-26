/** 项目导读：赛事跟进表 Excel 生成器；格式克制但完整，留白给现场真正填写的人。 */
import ExcelJS from "exceljs";
import { formatDate } from "@/lib/event-roster/grouping";
import type { RosterEvent, ScheduleGroup } from "@/types/event-roster";

export async function createRosterWorkbook(events: RosterEvent[], groups: ScheduleGroup[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "文艺体育中心志愿服务管理系统";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("赛事跟进排班表", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 24 }
  });

  worksheet.columns = [
    { header: "日期", key: "date", width: 14 },
    { header: "开始时间", key: "time", width: 14 },
    { header: "涉及比赛", key: "events", width: 42 },
    { header: "跟进人员", key: "people", width: 22 }
  ];
  const eventMap = new Map(events.map((item) => [item.id, item]));
  for (const group of groups) {
    const eventNames = group.eventIds.map((id) => eventMap.get(id)).filter(Boolean).map((item) => {
      const stage = item?.stage ? `（${item.stage}）` : "";
      return `${item?.event || "项目待确认"}${stage}`;
    });
    worksheet.addRow({ date: formatDate(group.date), time: group.startTime || "时间待确认", events: eventNames.join("\n"), people: "" });
  }

  const header = worksheet.getRow(1);
  header.height = 28;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0071E3" } };
  header.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "middle", wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9DE" } },
        left: { style: "thin", color: { argb: "FFD9D9DE" } },
        bottom: { style: "thin", color: { argb: "FFD9D9DE" } },
        right: { style: "thin", color: { argb: "FFD9D9DE" } }
      };
    });
    if (rowNumber > 1) row.height = Math.max(28, String(row.getCell(3).value ?? "").split("\n").length * 20);
  });
  worksheet.autoFilter = { from: "A1", to: "D1" };
  worksheet.getColumn(1).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getColumn(2).alignment = { horizontal: "center", vertical: "middle" };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function safeRosterFileName(title: string) {
  const cleaned = title.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").slice(0, 80);
  return `${cleaned || "赛事跟进排班表"}.xlsx`;
}
