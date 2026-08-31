/** 项目导读：页面入口 admin → tutorials → new：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { TutorialEditorForm } from "@/components/tutorials/TutorialEditorForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AdminNewTutorialPage() {
  return (
    <>
      <PageHeader actionHref="/admin/tutorials" actionLabel="返回教程管理" description="内容未完成时可先保存草稿，准备好后再正式发布。" title="新建教程" />
      <TutorialEditorForm />
    </>
  );
}
