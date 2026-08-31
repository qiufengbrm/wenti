/** 项目导读：页面入口 volunteer → tutorials：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { Eye, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTutorials } from "@/lib/data";

export default async function VolunteerTutorialsPage() {
  const tutorials = await getTutorials(true);

  return (
    <>
      <PageHeader description="查看面向志愿者开放的已发布教程和相关附件。" title="教程中心" />
      <DataTable
        columns={[
          { key: "title", header: "教程标题", render: (tutorial) => <div><p className="font-semibold text-[#1d1d1f]">{tutorial.title}</p>{tutorial.hasAttachment ? <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#86868b]"><Paperclip size={12} />含附件</p> : null}</div> },
          { key: "category", header: "分类" },
          { key: "author", header: "作者" },
          { key: "date", header: "发布时间" },
          { key: "actions", header: "", render: (tutorial) => <Button className="gap-1.5 px-3" href={`/volunteer/tutorials/${tutorial.id}`} variant="secondary"><Eye size={15} />查看教程</Button> }
        ]}
        data={tutorials}
        emptyText="暂无已发布教程"
      />
    </>
  );
}
