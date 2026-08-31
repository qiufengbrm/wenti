/** 项目导读：页面入口 volunteer → schedule：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { ScheduleSummary } from "@/components/schedules/ScheduleSummary";
import { ScheduleUploader } from "@/components/schedules/ScheduleUploader";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireVolunteer } from "@/lib/auth";
import { getVolunteerSchedule } from "@/lib/schedule-data";

export default async function VolunteerSchedulePage() {
  const user = await requireVolunteer();
  const schedule = await getVolunteerSchedule(user.id);

  return (
    <>
      <PageHeader description="上传学校导出的课表，自动识别课程、上课时间和周次。" title="我的课表" />
      <div className="grid gap-6">
        <ScheduleUploader hasSchedule={Boolean(schedule)} />
        <ScheduleSummary schedule={schedule} />
      </div>
    </>
  );
}
