/** 项目导读：页面入口 admin → tasks → hours → review：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { VolunteerHourReviewQueue } from "@/components/hours/VolunteerHourReviewQueue";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { getPendingHourReviewItems } from "@/lib/data";

export default async function VolunteerHourReviewPage() {
  await requireAdmin();
  const items = await getPendingHourReviewItems();
  return <><PageHeader actionHref="/admin/tasks" actionLabel="返回任务管理" description="快速处理志愿者主动提交的志愿服务时长申请。" title="审核志愿时长" /><VolunteerHourReviewQueue initialItems={items} /></>;
}
