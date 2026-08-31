/** 项目导读：页面入口 volunteer → hours：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { CalendarDays, ChevronDown, Clock3, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireVolunteer } from "@/lib/auth";
import { getAdminVolunteerHourDetail } from "@/lib/data";

export default async function VolunteerHoursPage() {
  const user = await requireVolunteer();
  const detail = await getAdminVolunteerHourDetail(user.id);
  const summary = detail?.summary ?? { totalHours: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0 };
  const records = detail?.records ?? [];

  return (
    <>
      <PageHeader description="查看自己的累计时长，并展开每条记录核对活动内容、服务时间、审核结果和证明材料。" title="我的志愿时长" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard hint="仅统计已通过记录" label="累计志愿时长" value={`${summary.totalHours} 小时`} />
        <StatCard hint="已计入累计时长" label="已通过" value={`${summary.approvedCount} 条`} />
        <StatCard hint="等待部门负责人处理" label="待审核" value={`${summary.pendingCount} 条`} />
        <StatCard hint="不计入累计时长" label="已驳回" value={`${summary.rejectedCount} 条`} />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-black/[0.06] px-5 py-4 sm:px-6">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f]">志愿时长明细</h2>
          <p className="mt-1 text-xs text-[#86868b]">点击任意记录的“查看详情”，即可展开完整申报信息。</p>
        </div>
        <div className="divide-y divide-black/[0.06]">
          {records.map((record) => (
            <details className="group" key={`${record.recordType}-${record.id}`}>
              <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-4 transition-colors hover:bg-black/[0.02] sm:flex-row sm:items-center sm:px-6 [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 rounded-[10px] bg-[#0071e3]/10 p-2 text-[#0066cc]"><FileText size={17} /></span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2"><strong className="font-semibold text-[#1d1d1f]">{record.activityName}</strong><Badge variant="gray">{record.source}</Badge><StatusBadge status={record.statusCode}>{record.status}</StatusBadge></span>
                    <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#86868b]"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{record.serviceTime}</span><span>提交于 {record.submittedAt}</span></span>
                  </span>
                </div>
                <span className="flex items-center justify-between gap-5 pl-11 sm:pl-0">
                  <span className="whitespace-nowrap"><strong className="text-lg text-[#1d1d1f]">{record.hours}</strong><span className="ml-1 text-xs text-[#86868b]">小时</span></span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0066cc]">查看详情<ChevronDown className="transition-transform duration-200 group-open:rotate-180" size={16} /></span>
                </span>
              </summary>
              <div className="border-t border-black/[0.045] bg-black/[0.018] px-5 py-5 sm:px-6 sm:pl-[76px]">
                <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
                  <Detail label="志愿服务内容" value={record.workContent} wide />
                  <Detail icon={<Clock3 size={14} />} label="服务时间" value={record.serviceTime} />
                  <Detail label="审核人" value={record.reviewedBy} />
                  <Detail label="备注" value={record.notes} wide />
                  {record.rejectReason ? <Detail label="驳回原因" value={record.rejectReason} wide /> : null}
                  <div className="lg:col-span-2">
                    <p className="text-xs font-medium text-[#86868b]">辅助证明材料</p>
                    {record.proofFileName && record.proofHref
                      ? <Button className="mt-2" download href={record.proofHref} variant="secondary">下载 {record.proofFileName}</Button>
                      : <p className="mt-1.5 text-sm text-[#515154]">未上传证明材料</p>}
                  </div>
                  {record.taskId ? <div className="lg:col-span-2"><Button href={`/volunteer/tasks/${record.taskId}`} variant="secondary">查看关联任务</Button></div> : null}
                </div>
              </div>
            </details>
          ))}
          {records.length === 0 ? <div className="px-5 py-16 text-center text-sm text-[#86868b]">暂时没有志愿时长记录</div> : null}
        </div>
      </Card>
    </>
  );
}

function StatusBadge({ status, children }: { status: string; children: React.ReactNode }) {
  return <Badge variant={status === "APPROVED" ? "green" : status === "PENDING" ? "amber" : "red"}>{children}</Badge>;
}

function Detail({ label, value, icon, wide = false }: { label: string; value: string; icon?: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "lg:col-span-2" : ""}><p className="flex items-center gap-1 text-xs font-medium text-[#86868b]">{icon}{label}</p><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[#3a3a3c]">{value}</p></div>;
}
