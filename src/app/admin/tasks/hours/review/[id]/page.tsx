/** 项目导读：页面入口 admin → tasks → hours → review → :id：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { notFound } from "next/navigation";
import { HourReviewActions } from "@/components/hours/HourReviewActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function VolunteerHourReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const item = await prisma.volunteerHour.findUnique({ where: { id }, include: { user: true, reviewedBy: true } });
  if (!item || item.taskId) notFound();
  const statusLabel = item.status === "PENDING" ? "待审核" : item.status === "APPROVED" ? "已通过" : "已驳回";
  return (
    <>
      <PageHeader actionHref="/admin/tasks/hours/review" actionLabel="返回审核列表" description="核对服务内容、服务时间、证明材料和备注后完成审核。" title="志愿时长申请详情" />
      <div className="mx-auto grid max-w-4xl gap-5">
        <Card className="p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2"><Info label="申请人" value={`${item.user.name}（${item.user.studentId ?? "无学号"}）`} /><Info label="申请状态" value={statusLabel} /><Info label="服务日期" value={formatDate(item.serviceStartAt)} /><Info label="服务时间" value={formatClockRange(item.serviceStartClockTime, item.serviceEndClockTime)} /><Info label="申请志愿时长" value={`${item.hours} 小时`} /><Info label="提交时间" value={formatDateTime(item.createdAt)} /></div>
          <div className="mt-6 grid gap-5"><TextInfo label="志愿服务内容" value={item.workContent ?? item.activityName} /><TextInfo label="备注" value={item.notes || "无"} /><div><p className="text-xs font-medium text-[#86868b]">辅助证明材料</p>{item.proofFileName ? <Button className="mt-2" href={`/api/hour-applications/${item.id}/proof`} variant="secondary">下载 {item.proofFileName}</Button> : <p className="mt-2 text-sm text-[#515154]">未上传证明材料</p>}</div>{item.rejectReason ? <TextInfo label="驳回原因" value={item.rejectReason} /> : null}</div>
        </Card>
        {item.status === "PENDING" ? <Card className="p-5"><HourReviewActions id={item.id} /></Card> : <div className="flex justify-end"><Button href="/admin/tasks/hours/review" variant="secondary">返回审核列表</Button></div>}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-[#86868b]">{label}</p><p className="mt-1.5 text-sm font-medium text-[#1d1d1f]">{value}</p></div>; }
function TextInfo({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-[#86868b]">{label}</p><p className="mt-2 whitespace-pre-wrap rounded-[10px] bg-black/[0.025] px-4 py-3 text-sm leading-6 text-[#3a3a3c]">{value}</p></div>; }
function formatDateTime(value: Date | null) { return value ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(value) : "-"; }
function formatDate(value: Date | null) { return value ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(value) : "-"; }
function formatClockRange(start: string | null, end: string | null) { return start || end ? `${start || "未填写"} — ${end || "未填写"}` : "未填写"; }
