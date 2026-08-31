/** 项目导读：课表组件：把课程和空闲时间变成看得懂的界面；红黄绿各司其职，不在这里表演交通灯蹦迪。 */
import { UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ScheduleGrid } from "@/components/schedules/ScheduleGrid";
import type { ScheduleData } from "@/types/schedule";

export function ScheduleSummary({ schedule, emptyText = "尚未上传课表" }: { schedule: ScheduleData | null; emptyText?: string }) {
  if (!schedule) {
    return <Card className="grid min-h-56 place-items-center text-center"><div><UploadCloud className="mx-auto mb-3 text-slate-300" size={38} /><h2 className="font-semibold text-slate-800">{emptyText}</h2><p className="mt-1 text-sm text-slate-500">上传学校系统导出的 .xls 或 .xlsx 文件后即可查看。</p></div></Card>;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm font-semibold text-slate-800">{schedule.academicTerm} 课表</p>
        <p className="text-xs text-slate-500">{schedule.courses.length} 门课程</p>
      </div>
      <ScheduleGrid courses={schedule.courses} />
    </div>
  );
}
