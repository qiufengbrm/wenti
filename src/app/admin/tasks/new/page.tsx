/** 项目导读：页面入口 admin → tasks → new：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { TaskPublishForm } from "@/components/forms/TaskPublishForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTaskTypes } from "@/lib/data";

export default async function AdminNewTaskPage() {
  const taskTypes = await getTaskTypes();

  return (
    <>
      <PageHeader description="选择任务类型后会自动带出默认模板，发布前仍可修改任务内容。" title="发布任务" />
      <TaskPublishForm taskTypes={taskTypes} />
    </>
  );
}
