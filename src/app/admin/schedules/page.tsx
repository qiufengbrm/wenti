/** 项目导读：页面入口 admin → schedules：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { ScheduleManagement } from "@/components/schedules/ScheduleManagement";
import { PageHeader } from "@/components/ui/PageHeader";
import { getScheduleDirectory } from "@/lib/schedule-data";

export default async function AdminSchedulesPage() {
  const volunteers = await getScheduleDirectory();
  return (
    <>
      <PageHeader description="查看志愿者课表、组合筛选空闲人员，并追踪尚未录入课表的同学。" title="课表管理" />
      <ScheduleManagement volunteers={volunteers} />
    </>
  );
}
