/** 项目导读：页面入口 volunteer → tasks：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { requireVolunteer } from "@/lib/auth";
import { getVolunteerTaskSummary } from "@/lib/data";

const sections = {
  take: {
    label: "接取任务",
    description: "按发布时间查看所有已发布过的任务"
  },
  mine: {
    label: "我的任务",
    description: "查看正在进行和已完成的全部任务"
  },
  review: {
    label: "待审核",
    description: "查看取消申请和志愿时长审核进度"
  }
};

type SectionKey = keyof typeof sections;

export default async function VolunteerTasksPage({
  searchParams
}: {
  searchParams?: Promise<{ section?: string; page?: string }>;
}) {
  const user = await requireVolunteer();
  const resolvedSearchParams = await searchParams;
  const section = getSectionKey(resolvedSearchParams?.section);
  const { recentTasks, currentTasks, allPublishedTasks, myTasks, reviewTasks } = await getVolunteerTaskSummary(user.id);
  const previewCurrentTasks = currentTasks.slice(0, 3);
  const activeTotal = section === "take" ? allPublishedTasks.length : section === "mine" ? myTasks.length : reviewTasks.length;
  const currentPage = clampPage(resolvedSearchParams?.page, activeTotal);
  const takeTasks = slicePage(allPublishedTasks, currentPage);
  const mineTasks = slicePage(myTasks, currentPage);
  const pendingReviewTasks = slicePage(reviewTasks, currentPage);

  return (
    <>
      <PageHeader description="查看最新任务、接取任务、我的任务和待审核事项。" title="任务广场" />
      <div className="grid gap-6">
        <Card className="border-[#0071e3]/15 bg-[#0071e3]/[0.055] p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div><h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1d1d1f]">参加了其他志愿服务？</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#515154]">无需等待部门负责人发布任务，填写服务内容、时间、志愿时长和证明材料即可提交审核。</p></div>
            <Button className="h-14 w-full shrink-0 px-8 text-base sm:w-auto" href="/volunteer/hours/apply">申请志愿时长</Button>
          </div>
        </Card>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">最近新发布</h2>
              <span className="text-sm text-slate-500">最多显示 3 个</span>
            </div>
            <DataTable columns={taskSquareColumns()} data={recentTasks} emptyText="暂无新发布任务" />
          </Card>
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">我正在进行的任务</h2>
              <span className="text-sm text-slate-500">最多显示 3 个</span>
            </div>
            <DataTable columns={taskSquareColumns()} data={previewCurrentTasks} emptyText="暂无正在进行的任务" />
            {currentTasks.length > 3 ? <p className="mt-3 text-center text-lg leading-none text-slate-400">...</p> : null}
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.entries(sections) as Array<[SectionKey, (typeof sections)[SectionKey]]>).map(([key, item]) => (
            <Button
              className="h-auto min-h-24 flex-col items-start rounded-lg px-5 py-4 text-left"
              href={`/volunteer/tasks?section=${key}`}
              key={key}
              variant={section === key ? "primary" : "secondary"}
            >
              <span className="text-base font-semibold">{item.label}</span>
              <span className={section === key ? "mt-2 text-sm text-blue-100" : "mt-2 text-sm text-slate-500"}>{item.description}</span>
            </Button>
          ))}
        </div>
        {section === "take" ? (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-950">接取任务</h2>
            <DataTable columns={taskColumns("接取任务", true)} data={takeTasks} emptyText="暂无可查看任务" />
            <Pagination basePath="/volunteer/tasks" currentPage={currentPage} query={{ section }} totalItems={allPublishedTasks.length} />
          </Card>
        ) : null}
        {section === "mine" ? (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-950">我的任务</h2>
            <DataTable columns={taskColumns("查看详情", true)} data={mineTasks} emptyText="暂无任务记录" />
            <Pagination basePath="/volunteer/tasks" currentPage={currentPage} query={{ section }} totalItems={myTasks.length} />
          </Card>
        ) : null}
        {section === "review" ? (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-950">待审核</h2>
            <DataTable
              columns={[
                { key: "title", header: "任务名称" },
                { key: "type", header: "类型" },
                { key: "reviewType", header: "审核类型" },
                { key: "status", header: "状态" },
                { key: "submittedAt", header: "提交时间" },
                { key: "actualHours", header: "实际时长" },
                { key: "proofDescription", header: "说明" },
                {
                  key: "actions",
                  header: "操作",
                  render: (row: { id: string }) => (
                    <Button href={`/volunteer/tasks/${row.id}`} variant="secondary">
                      查看详情
                    </Button>
                  )
                }
              ]}
              data={pendingReviewTasks}
              emptyText="暂无待审核事项"
            />
            <Pagination basePath="/volunteer/tasks" currentPage={currentPage} query={{ section }} totalItems={reviewTasks.length} />
          </Card>
        ) : null}
      </div>
    </>
  );
}

function taskColumns(actionLabel: string, showCreatedAt = false) {
  return [
    { key: "title", header: "任务名称" },
    { key: "type", header: "类型" },
    { key: "time", header: "任务时间", render: (row: { startTime: string; endTime: string }) => `${row.startTime} - ${row.endTime}` },
    ...(showCreatedAt ? [{ key: "createdAt", header: "发布时间" }] : []),
    { key: "maxMembers", header: "所需人数" },
    { key: "signupCount", header: "已报名人数" },
    { key: "estimatedHours", header: "预计时长" },
    { key: "status", header: "状态" },
    {
      key: "actions",
      header: "操作",
      render: (row: { id: string }) => (
        <Button href={`/volunteer/tasks/${row.id}`} variant="secondary">
          {actionLabel}
        </Button>
      )
    }
  ];
}

function taskSquareColumns() {
  return [
    { key: "title", header: "任务名称" },
    {
      key: "time",
      header: "时间",
      render: (row: { startTime: string; endTime: string }) => simplifyTaskTime(row.startTime, row.endTime)
    },
    { key: "status", header: "状态" },
    {
      key: "actions",
      header: "操作",
      render: (row: { id: string }) => (
        <Button href={`/volunteer/tasks/${row.id}`} variant="secondary">
          查看详情
        </Button>
      )
    }
  ];
}

function simplifyTaskTime(startTime: string, endTime: string) {
  if (startTime === "-" && endTime === "-") {
    return "时间待定";
  }

  const start = toShortDate(startTime);
  const end = toShortDate(endTime);

  if (startTime === "-") {
    return `至 ${end}`;
  }

  if (endTime === "-") {
    return start;
  }

  return start === end ? start : `${start} - ${end}`;
}

function toShortDate(value: string) {
  const match = value.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);

  if (!match) {
    return value;
  }

  return `${match[2]}-${match[3]}`;
}

function getSectionKey(value?: string): SectionKey {
  return value === "mine" || value === "review" || value === "take" ? value : "take";
}

function slicePage<T>(items: T[], page: number) {
  return items.slice((page - 1) * 10, page * 10);
}

function clampPage(value: string | undefined, totalItems: number) {
  const requested = Number.parseInt(value ?? "1", 10);
  const totalPages = Math.max(1, Math.ceil(totalItems / 10));
  return Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);
}
