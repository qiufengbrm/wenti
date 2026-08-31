/** 项目导读：页面入口 volunteer：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireVolunteer } from "@/lib/auth";
import { getTutorials, getVolunteerHours, getVolunteerTaskSummary } from "@/lib/data";

export default async function VolunteerHomePage() {
  const user = await requireVolunteer();
  const [tutorials, hours, taskSummary] = await Promise.all([
    getTutorials(true),
    getVolunteerHours(user.id),
    getVolunteerTaskSummary(user.id)
  ]);
  const hourTotal = hours.reduce((sum, item) => sum + Number(item.hours), 0);

  return (
    <>
      <PageHeader description="查看待办任务、个人志愿时长和最新教程。" title="志愿者首页" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard hint={taskSummary.currentTasks[0]?.title} href="/volunteer/tasks" label="我的待办任务" value={taskSummary.currentTasks.length} />
        <StatCard hint="已确认和待审核记录" href="/volunteer/hours" label="我的志愿时长" value={`${hourTotal}h`} />
        <StatCard hint={tutorials[0]?.title} href="/volunteer/tutorials" label="最近教程" value={tutorials.length} />
      </div>
      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">待办任务</h2>
        <DataTable columns={[{ key: "title", header: "任务" }, { key: "type", header: "类型" }, { key: "status", header: "状态" }]} data={taskSummary.currentTasks} />
      </Card>
    </>
  );
}
