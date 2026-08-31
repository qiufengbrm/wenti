/** 项目导读：页面入口 volunteer → tasks → :id：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { VolunteerTaskWorkflow } from "@/components/tasks/VolunteerTaskWorkflow";
import { requireVolunteer } from "@/lib/auth";
import { getTaskDetail, getVolunteerTaskSignup } from "@/lib/data";

export default async function VolunteerTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireVolunteer();
  const { id } = await params;
  const detail = await getTaskDetail(id);

  if (!detail) {
    notFound();
  }

  const { task } = detail;
  const signup = await getVolunteerTaskSignup(task.id, user.id);
  const activeSignup = signup?.status === "已取消" ? undefined : signup;

  return (
    <>
      <PageHeader description="查看任务详细信息，接取后可提交完成证明或申请取消。" title={task.title} />
      <div className="grid gap-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">任务类型</p>
              <p className="mt-1 inline-flex rounded-md bg-blue-50 px-3 py-1 text-base font-semibold text-blue-700">{task.type}</p>
            </div>
            <dl className="grid min-w-56 grid-cols-2 gap-2 text-sm">
              <TimeInfo label="开始时间" value={task.startTime} />
              <TimeInfo label="结束时间" value={task.endTime} highlight />
            </dl>
          </div>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            <h2 className="mb-2 text-base font-semibold text-slate-950">任务内容</h2>
            <p className="text-sm leading-6 text-slate-700">{task.description}</p>
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
            <Info label="预计时长" value={`${task.estimatedHours} 小时`} />
            <Info label="报名人数" value={task.members} />
          </dl>
          {!activeSignup ? <VolunteerTaskWorkflow initialSignup={activeSignup} mode="signup" task={task} /> : null}
        </Card>
        {activeSignup ? <VolunteerTaskWorkflow initialSignup={activeSignup} task={task} /> : null}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-950">{value}</dd>
    </div>
  );
}

function TimeInfo({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-md border border-blue-200 bg-blue-50 p-3" : "rounded-md border border-slate-200 bg-white p-3"}>
      <dt className={highlight ? "text-xs font-medium text-blue-600" : "text-xs font-medium text-slate-500"}>{label}</dt>
      <dd className={highlight ? "mt-1 font-semibold text-blue-800" : "mt-1 font-semibold text-slate-950"}>{value}</dd>
    </div>
  );
}
