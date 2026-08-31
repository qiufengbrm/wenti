/** 项目导读：页面入口 admin → tutorials → :id → edit：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { notFound } from "next/navigation";
import { TutorialEditorForm } from "@/components/tutorials/TutorialEditorForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTutorialDetail } from "@/lib/data";

export default async function AdminEditTutorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tutorial = await getTutorialDetail(id);
  if (!tutorial) notFound();

  return (
    <>
      <PageHeader actionHref="/admin/tutorials" actionLabel="返回教程管理" description={`当前状态：${tutorial.statusLabel} · 最后更新：${tutorial.updatedAt}`} title="编辑教程" />
      <TutorialEditorForm tutorial={tutorial} />
    </>
  );
}
