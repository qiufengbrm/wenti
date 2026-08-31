/** 项目导读：页面入口 admin → tutorials：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { Paperclip, Pencil } from "lucide-react";
import { DeleteTutorialButton } from "@/components/tutorials/DeleteTutorialButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTutorials } from "@/lib/data";

export default async function AdminTutorialsPage() {
  const tutorials = await getTutorials();

  return (
    <>
      <PageHeader actionHref="/admin/tutorials/new" actionLabel="新建教程" description="创建教程、保存草稿、发布内容并管理教程附件。" title="教程管理" />
      <DataTable
        columns={[
          { key: "title", header: "教程标题", render: (tutorial) => <div><p className="font-semibold text-[#1d1d1f]">{tutorial.title}</p>{tutorial.hasAttachment ? <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#86868b]"><Paperclip size={12} />{tutorial.attachmentFileName}</p> : null}</div> },
          { key: "category", header: "分类" },
          { key: "author", header: "作者" },
          { key: "status", header: "状态", render: (tutorial) => <Badge variant={tutorial.statusCode === "PUBLISHED" ? "green" : "gray"}>{tutorial.status}</Badge> },
          { key: "visibility", header: "可见范围" },
          { key: "date", header: "发布 / 更新日期" },
          { key: "actions", header: "操作", render: (tutorial) => <div className="flex items-center gap-1"><Button className="gap-1.5 px-3" href={`/admin/tutorials/${tutorial.id}/edit`} variant="secondary"><Pencil size={15} />编辑</Button><DeleteTutorialButton tutorialId={tutorial.id} title={tutorial.title} /></div> }
        ]}
        data={tutorials}
        emptyText="暂无教程，点击右上角新建教程"
      />
    </>
  );
}
