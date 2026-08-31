/** 项目导读：页面入口 admin：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { VolunteerHourReviewQueue } from "@/components/hours/VolunteerHourReviewQueue";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/data";
import { isSuperAdmin } from "@/lib/permissions";

export default async function AdminHomePage() {
  const user = await requireAdmin();
  const { volunteerCount, files, pendingHourApplications, tutorials, tasks } = await getAdminOverview();
  const showSystemOverview = isSuperAdmin(user.role);

  return (
    <>
      <PageHeader description="查看文艺体育中心核心数据和近期动态。" title="管理员首页" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard hint="数据库统计" href="/admin/volunteers" label="志愿者总数" value={volunteerCount} />
        <StatCard hint={files[0]?.title} href="/admin/files" label="最近上传资料" value={files.length} />
        <StatCard hint="志愿者自主申报" href="/admin/tasks/hours/review" label="待审核志愿时长" value={pendingHourApplications.length} />
      </div>
      <div className="mt-6">
        <VolunteerHourReviewQueue initialItems={pendingHourApplications} title="审核志愿时长" />
      </div>
      {showSystemOverview ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-950">全部任务</h2>
            <DataTable
              columns={[
                { key: "title", header: "任务名称" },
                { key: "type", header: "类型" },
                { key: "status", header: "状态" }
              ]}
              data={tasks}
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-950">管理员上传文件</h2>
            <DataTable
              columns={[
                { key: "title", header: "文件名称" },
                { key: "category", header: "分类" },
                { key: "uploader", header: "上传人" },
                { key: "date", header: "上传时间" }
              ]}
              data={files}
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-950">全部教程和发布信息</h2>
            <DataTable
              columns={[
                { key: "title", header: "标题" },
                { key: "category", header: "分类" },
                { key: "author", header: "发布人" },
                { key: "date", header: "发布时间" }
              ]}
              data={tutorials}
            />
          </Card>
        </div>
      ) : null}
    </>
  );
}
