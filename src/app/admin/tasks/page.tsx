/** 项目导读：页面入口 admin → tasks：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { DatePicker } from "@/components/ui/DatePicker";
import { Pagination } from "@/components/ui/Pagination";
import { AdminTaskReviewBoard } from "@/components/tasks/AdminTaskReviewBoard";
import { ArchiveTaskButton } from "@/components/tasks/ArchiveTaskButton";
import { DeleteTaskButton } from "@/components/tasks/DeleteTaskButton";
import { requireAdmin } from "@/lib/auth";
import { getAdminTaskReviewQueue, getPendingHourReviewItems, getTasks, getTaskTypes } from "@/lib/data";

export default async function AdminTasksPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  const user = await requireAdmin();
  const resolvedSearchParams = await searchParams;
  const [taskTypes, tasks, reviewQueue, hourReviewItems] = await Promise.all([getTaskTypes(), getTasks(), getAdminTaskReviewQueue(user.id), getPendingHourReviewItems()]);
  const currentPage = clampPage(resolvedSearchParams?.page, tasks.length);
  const paginatedTasks = tasks.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <>
      <PageHeader description="维护任务、报名名单、完成证明和审核状态。" title="任务管理" />
      <Card className="mb-6 overflow-hidden p-0">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col justify-between gap-5 border-b border-black/[0.07] p-5 sm:p-6 md:border-b-0 md:border-r">
            <div><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-[#1d1d1f]">志愿时长审核</h2><span className="rounded-full bg-[#ff9f0a]/10 px-2.5 py-1 text-xs font-semibold text-[#a05a00]">{hourReviewItems.length} 条待审核</span></div><p className="mt-2 text-sm leading-6 text-[#6e6e73]">统一处理自主申报和任务完成后提交的志愿时长。</p></div>
            <Button className="w-full sm:w-fit" href="/admin/tasks/hours/review">进入审核</Button>
          </div>
          <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
            <div><h2 className="text-base font-semibold text-[#1d1d1f]">任务发布</h2><p className="mt-2 text-sm leading-6 text-[#6e6e73]">发布常规志愿任务，或维护可复用的任务模板。</p></div>
            <div className="flex flex-wrap gap-3"><Button href="/admin/tasks/new">发布任务</Button><Button href="/admin/tasks/types" variant="secondary">任务模板</Button></div>
          </div>
        </div>
      </Card>
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">待我审核</h2>
          <span className="text-sm text-slate-500">{reviewQueue.length} 条待处理</span>
        </div>
        <AdminTaskReviewBoard initialNotifications={[]} initialSignups={reviewQueue} variant="summary" />
      </div>
      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" placeholder="搜索任务标题" />
          <select className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500">
            <option>全部任务类型</option>
            {taskTypes.map((type) => (
              <option key={type.id}>{type.name}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-500">
            <option>全部状态</option>
            <option>已发布</option>
            <option>人数已满</option>
            <option>已结束</option>
            <option>已归档</option>
          </select>
          <DatePicker ariaLabel="按任务日期筛选" placeholder="筛选任务日期" />
        </div>
      </Card>
      <DataTable
        columns={[
          { key: "title", header: "任务名称" },
          { key: "type", header: "类型" },
          { key: "time", header: "任务日期 / 时间", render: (row) => formatTaskScheduleRange(String(row.startTime), String(row.endTime)) },
          { key: "members", header: "报名人数" },
          { key: "estimatedHours", header: "预计时长" },
          { key: "status", header: "状态" },
          { key: "createdBy", header: "发布人" },
          {
            key: "actions",
            header: "操作",
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                <Button href={`/admin/tasks/${row.id}`} variant="secondary">
                  详情
                </Button>
                <ArchiveTaskButton archived={String(row.status) === "已归档"} taskId={String(row.id)} />
                <DeleteTaskButton taskId={String(row.id)} taskTitle={String(row.title)} />
              </div>
            )
          }
        ]}
        data={paginatedTasks}
      />
      <Pagination basePath="/admin/tasks" currentPage={currentPage} totalItems={tasks.length} />
    </>
  );
}

function clampPage(value: string | undefined, totalItems: number) {
  const requested = Number.parseInt(value ?? "1", 10);
  const totalPages = Math.max(1, Math.ceil(totalItems / 10));
  return Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);
}

function formatTaskScheduleRange(start: string, end: string) {
  if (start === "-" && end === "-") return "日期待定";
  if (start === "-") return `至 ${end}`;
  if (end === "-") return start;
  const startDate = start.slice(0, 10);
  const endDate = end.slice(0, 10);
  if (startDate === endDate && end.length > 10) return `${start} - ${end.slice(11)}`;
  return `${start} - ${end}`;
}
