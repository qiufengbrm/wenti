/** 项目导读：页面入口 admin → schedules → :id：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { notFound } from "next/navigation";
import { ScheduleSummary } from "@/components/schedules/ScheduleSummary";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAdminScheduleDetail } from "@/lib/schedule-data";

export default async function AdminScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminScheduleDetail(id);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        actionHref="/admin/schedules"
        actionLabel="返回课表管理"
        description={`${detail.volunteer.studentId} · ${detail.volunteer.major} · ${detail.volunteer.className}`}
        title={`${detail.volunteer.name} 的课表`}
      />
      <ScheduleSummary emptyText="该志愿者尚未上传课表" schedule={detail.schedule} />
    </>
  );
}
