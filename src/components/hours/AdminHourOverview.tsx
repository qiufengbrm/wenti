/** 项目导读：志愿时长组件：围绕申报、证明和审核组织交互；小时数虽小，账一定要算明白。 */
"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type VolunteerHourSummary = {
  id: string;
  name: string;
  studentId: string;
  major: string;
  className: string;
  totalHours: number;
  currentMonthHours: number;
  approvedCount: number;
  pendingCount: number;
  lastServiceAt: string;
};

export function AdminHourOverview({ volunteers, availableMonths }: { volunteers: VolunteerHourSummary[]; availableMonths: string[] }) {
  const [keyword, setKeyword] = useState("");
  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return volunteers;
    return volunteers.filter((volunteer) =>
      [volunteer.name, volunteer.studentId, volunteer.major, volunteer.className].some((value) => value.toLowerCase().includes(normalized))
    );
  }, [keyword, volunteers]);

  return (
    <div className="grid gap-6">
      <HourExport availableMonths={availableMonths} />
      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">志愿者时长总览</h2>
            <p className="mt-1 text-xs text-[#86868b]">总时长仅统计已通过的申报记录</p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" size={17} />
            <input
              aria-label="搜索志愿者"
              className="h-10 w-full border border-black/[0.12] pl-9 pr-3 text-sm outline-none"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索姓名、学号、专业或班级"
              value={keyword}
            />
          </div>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {filtered.map((volunteer) => <article className="rounded-[14px] border border-black/[0.07] bg-white/90 p-4" key={volunteer.id}>
            <div className="flex items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0071e3]/10 font-semibold text-[#0066cc]">{volunteer.name.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#1d1d1f]">{volunteer.name}</p><p className="mt-0.5 truncate text-xs text-[#86868b]">{volunteer.studentId} · {volunteer.major} · {volunteer.className}</p></div><div className="text-right"><p className="text-xl font-semibold tracking-tight text-[#1d1d1f]">{formatHours(volunteer.totalHours)}</p><p className="text-[10px] text-[#86868b]">累计小时</p></div></div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-[10px] bg-black/[0.025] p-3 text-center"><MobileMetric label="本月" value={`${formatHours(volunteer.currentMonthHours)}h`} /><MobileMetric label="有效记录" value={`${volunteer.approvedCount} 条`} /><MobileMetric label="待审核" value={`${volunteer.pendingCount} 条`} /></div>
            <Button className="mt-3 w-full gap-1" href={`/admin/hours/${volunteer.id}`} variant="secondary">查看明细<ChevronRight size={15} /></Button>
          </article>)}
          {filtered.length === 0 ? <div className="py-12 text-center text-sm text-[#86868b]">没有找到符合条件的志愿者</div> : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-black/[0.06] text-sm">
            <thead className="bg-black/[0.02]">
              <tr>
                {["志愿者", "学籍信息", "累计总时长", "本月时长", "有效记录", "待审核", "最近服务", ""].map((label, index) => (
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-[#6e6e73]" key={`${label}-${index}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.055]">
              {filtered.map((volunteer) => (
                <tr className="group transition-colors hover:bg-[#0071e3]/[0.035]" key={volunteer.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0071e3]/10 font-semibold text-[#0066cc]">{volunteer.name.slice(0, 1)}</div>
                      <div><p className="font-semibold text-[#1d1d1f]">{volunteer.name}</p><p className="mt-0.5 text-xs text-[#86868b]">{volunteer.studentId}</p></div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-[#515154]"><p>{volunteer.major}</p><p className="mt-0.5 text-xs text-[#86868b]">{volunteer.className}</p></td>
                  <td className="whitespace-nowrap px-5 py-4"><span className="text-lg font-semibold tracking-tight text-[#1d1d1f]">{formatHours(volunteer.totalHours)}</span><span className="ml-1 text-xs text-[#86868b]">小时</span></td>
                  <td className="whitespace-nowrap px-5 py-4 text-[#515154]">{formatHours(volunteer.currentMonthHours)} 小时</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[#515154]">{volunteer.approvedCount} 条</td>
                  <td className="whitespace-nowrap px-5 py-4">{volunteer.pendingCount ? <span className="rounded-full bg-[#ff9f0a]/12 px-2.5 py-1 text-xs font-semibold text-[#a05a00]">{volunteer.pendingCount} 条</span> : <span className="text-[#86868b]">0</span>}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[#6e6e73]">{volunteer.lastServiceAt}</td>
                  <td className="px-5 py-4 text-right"><Button className="gap-1 px-3" href={`/admin/hours/${volunteer.id}`} variant="ghost">查看明细<ChevronRight size={15} /></Button></td>
                </tr>
              ))}
              {filtered.length === 0 ? <tr><td className="px-5 py-14 text-center text-[#86868b]" colSpan={8}>没有找到符合条件的志愿者</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-black/[0.06] px-5 py-3 text-xs text-[#86868b]">共 {volunteers.length} 名志愿者，当前显示 {filtered.length} 名</div>
      </Card>
    </div>
  );
}

export function HourExport({ availableMonths }: { availableMonths: string[] }) {
  const [month, setMonth] = useState(availableMonths[0] ?? "");

  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">导出志愿时长</h2>
        <p className="mt-1 text-xs leading-5 text-[#86868b]">导出 Excel 汇总表，每名志愿者一行，仅包含姓名、学号和已通过的总志愿时长。</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select aria-label="选择导出月份" className="h-10 min-w-36 border border-black/[0.12] bg-white px-3 text-sm" disabled={!availableMonths.length} onChange={(event) => setMonth(event.target.value)} value={month}>
          {availableMonths.length ? availableMonths.map((value) => <option key={value} value={value}>{formatMonth(value)}</option>) : <option value="">暂无可导出月份</option>}
        </select>
        <Button className="gap-2" disabled={!month} download href={month ? `/api/hours/export?month=${month}` : undefined} variant="secondary"><Download size={16} />导出该月 Excel</Button>
        <Button className="gap-2" download href="/api/hours/export?scope=all"><Download size={16} />导出全部 Excel</Button>
      </div>
    </Card>
  );
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return `${year} 年 ${Number(month)} 月`;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="font-semibold text-[#1d1d1f]">{value}</p><p className="mt-0.5 text-[10px] text-[#86868b]">{label}</p></div>;
}
