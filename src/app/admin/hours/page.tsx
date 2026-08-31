/** 项目导读：页面入口 admin → hours：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { AdminHourOverview } from "@/components/hours/AdminHourOverview";
import { StatCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAdminHourOverview } from "@/lib/data";

export default async function AdminHoursPage() {
  const { volunteers, availableMonths, summary } = await getAdminHourOverview();

  return (
    <>
      <PageHeader description="查看所有志愿者的累计时长，进入个人明细核对每一条申报，并按月或全部导出。" title="志愿时长管理" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard hint="所有已通过记录合计" label="累计志愿时长" value={`${summary.totalHours} 小时`} />
        <StatCard hint="按服务日期统计" label="本月新增时长" value={`${summary.currentMonthHours} 小时`} />
        <StatCard hint={`共 ${volunteers.length} 名志愿者`} label="已有有效时长" value={`${summary.volunteersWithHours} 人`} />
        <StatCard hint="可前往任务管理审核" label="待审核申报" value={`${summary.pendingCount} 条`} />
      </div>
      <AdminHourOverview availableMonths={availableMonths} volunteers={volunteers} />
    </>
  );
}
