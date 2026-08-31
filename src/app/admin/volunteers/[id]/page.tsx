/** 项目导读：页面入口 admin → volunteers → :id：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVolunteerDetail } from "@/lib/data";
import { getVolunteerSchedule } from "@/lib/schedule-data";
import { ScheduleSummary } from "@/components/schedules/ScheduleSummary";

export default async function AdminVolunteerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, schedule] = await Promise.all([getVolunteerDetail(id), getVolunteerSchedule(id)]);

  if (!detail) {
    notFound();
  }

  const { volunteer, tasks, hours } = detail;

  return (
    <>
      <PageHeader description="查看志愿者基础资料、任务参与和志愿时长记录。" title={`${volunteer.name} 的详情`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">基本信息</h2>
          <dl className="grid gap-3 text-sm">
            <Info label="学号" value={volunteer.studentId} />
            <Info label="专业" value={volunteer.major} />
            <Info label="班级" value={volunteer.className} />
            <Info label="联系电话" value={volunteer.phone ?? "-"} />
            <Info label="QQ" value={volunteer.qq} />
            <Info label="微信" value={volunteer.wechat} />
            <Info label="特长" value={volunteer.skills} />
          </dl>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">管理员备注</h2>
          <div className="min-h-36 rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-700">{volunteer.notes === "-" ? "暂无备注" : volunteer.notes}</div>
        </Card>
      </div>
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">个人课表</h2>
        <ScheduleSummary emptyText="该志愿者尚未上传课表" schedule={schedule} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">参与任务</h2>
          <DataTable columns={[{ key: "title", header: "任务" }, { key: "type", header: "类型" }, { key: "status", header: "状态" }]} data={tasks} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">志愿时长记录</h2>
          <DataTable columns={[{ key: "activityName", header: "活动" }, { key: "hours", header: "志愿时长" }, { key: "status", header: "状态" }]} data={hours} />
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
