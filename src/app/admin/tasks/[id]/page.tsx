/** 项目导读：页面入口 admin → tasks → :id：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { AdminTaskReviewBoard } from "@/components/tasks/AdminTaskReviewBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMessages, getTaskDetail } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

export default async function AdminTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  const detail = await getTaskDetail(id);

  if (!detail) {
    notFound();
  }

  const { task, signups } = detail;
  const notifications = await getMessages(user.id);

  return (
    <>
      <PageHeader description="查看任务信息、报名名单和反馈列表。" title={task.title} />
      <Card>
        <dl className="grid gap-3 text-sm md:grid-cols-4">
          <Info label="类型" value={task.type} />
          <Info label="开始时间" value={task.startTime} />
          <Info label="结束时间" value={task.endTime} />
          <Info label="报名人数" value={task.members} />
          <Info label="预计时长" value={`${task.estimatedHours} 小时`} />
          <Info label="状态" value={task.status} />
          <Info label="需要证明" value={task.needProof ? "是" : "否"} />
          <Info label="允许取消申请" value={task.allowCancel ? "是" : "否"} />
          <Info label="取消需审核" value={task.cancelNeedsReview ? "是" : "否"} />
        </dl>
        <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-600">{task.description}</div>
      </Card>
      <AdminTaskReviewBoard initialNotifications={notifications} initialSignups={signups} />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}
