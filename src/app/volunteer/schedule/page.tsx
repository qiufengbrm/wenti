/** 项目导读：页面入口 volunteer → schedule：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { ScheduleSummary } from "@/components/schedules/ScheduleSummary";
import { ScheduleUploader } from "@/components/schedules/ScheduleUploader";
import { CampusSync } from "@/components/schedules/CampusSync";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireVolunteer } from "@/lib/auth";
import { getVolunteerSchedule } from "@/lib/schedule-data";
import { prisma } from "@/lib/db";

export default async function VolunteerSchedulePage() {
  const user = await requireVolunteer();
  const schedule = await getVolunteerSchedule(user.id);
  const campusSession = await prisma.campusSession.findUnique({ where: { userId: user.id }, select: { status: true, expiresAt: true, lastSyncedAt: true } });

  return (
    <>
      <PageHeader description="授权华师本科智慧教务同步，或上传学校导出的 Excel 课表。" title="我的课表" />
      <div className="grid gap-6">
        <CampusSync studentId={user.studentId ?? ""} term={schedule?.academicTerm ?? ""} session={campusSession ? { status: campusSession.status, expiresAt: campusSession.expiresAt.toISOString(), lastSyncedAt: campusSession.lastSyncedAt?.toISOString() ?? null } : null} />
        <ScheduleUploader hasSchedule={Boolean(schedule)} />
        {schedule ? <p className="text-sm text-slate-500">来源：{schedule.source === "CCNU" ? "华师本科智慧教务" : "Excel 上传"}{schedule.syncedAt ? ` · 最近同步 ${new Date(schedule.syncedAt).toLocaleString("zh-CN")}` : ""}</p> : null}
        <ScheduleSummary schedule={schedule} />
      </div>
    </>
  );
}
