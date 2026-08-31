/** 项目导读：页面入口 admin → tasks → types：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { TaskTypeForm } from "@/components/forms/TaskTypeForm";
import { getTaskTypes } from "@/lib/data";

export default async function AdminTaskTypesPage() {
  const taskTypes = await getTaskTypes();

  return (
    <>
      <PageHeader description="维护任务模板、默认内容和默认预计时长。发布任务时可直接套用启用模板。" title="任务模板管理" />
      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">新建任务模板</h2>
          <TaskTypeForm />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">模板规则</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <p>模板只作为发布任务时的参考内容。</p>
            <p>管理员修改某一次任务内容，不会影响任务类型默认模板。</p>
            <p>只有启用的任务类型会出现在发布任务表单中。</p>
            <p>预计时长和实际志愿时长都必须使用 0.5 小时作为最小单位。</p>
          </div>
        </Card>
      </div>
      <DataTable
        columns={[
          { key: "name", header: "模板名称" },
          { key: "description", header: "说明" },
          { key: "defaultHours", header: "默认时长" },
          { key: "isActive", header: "状态", render: (row) => (row.isActive ? "启用" : "停用") },
          { key: "defaultTemplate", header: "默认模板" }
        ]}
        data={taskTypes}
      />
    </>
  );
}
