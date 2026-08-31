/** 项目导读：页面入口 volunteer → tutorials → :id：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { notFound } from "next/navigation";
import { Download, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTutorialDetail } from "@/lib/data";

export default async function VolunteerTutorialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tutorial = await getTutorialDetail(id, true);
  if (!tutorial) notFound();

  return (
    <>
      <PageHeader actionHref="/volunteer/tutorials" actionLabel="返回教程中心" description={`${tutorial.category} · ${tutorial.author} · 发布于 ${tutorial.publishedAt ?? tutorial.updatedAt}`} title={tutorial.title} />
      <div className="grid gap-5">
        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap gap-2"><Badge variant="blue">{tutorial.category}</Badge>{tutorial.isPinned ? <Badge variant="amber">置顶</Badge> : null}</div>
          {tutorial.contentFormat === "RICH_TEXT" ? (
            <div
              className="tutorial-rich-content break-words text-[15px] leading-8 text-[#3a3a3c] [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#0071e3]/25 [&_blockquote]:pl-4 [&_font]:leading-inherit [&_h2]:my-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:my-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:my-3 [&_h4]:text-lg [&_h4]:font-semibold [&_img]:my-5 [&_img]:h-auto [&_img]:max-h-[75vh] [&_img]:max-w-full [&_img]:rounded-[14px] [&_img]:border [&_img]:border-black/[0.08] [&_img]:shadow-soft [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: tutorial.content }}
            />
          ) : <div className="whitespace-pre-wrap text-[15px] leading-8 text-[#3a3a3c]">{tutorial.content}</div>}
        </Card>
        {tutorial.attachmentFileName ? <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0071e3]/10 text-[#0066cc]"><Paperclip size={19} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1d1d1f]">{tutorial.attachmentFileName}</p><p className="mt-1 text-xs text-[#86868b]">教程附件 · {formatFileSize(tutorial.attachmentFileSize)}</p></div></div>
          <Button className="gap-2" download href={`/api/tutorials/${tutorial.id}/attachment`} variant="secondary"><Download size={16} />下载附件</Button>
        </Card> : null}
      </div>
    </>
  );
}

function formatFileSize(size: number | null) {
  if (!size) return "大小未知";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
