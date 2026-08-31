/** 项目导读：页面入口 volunteer → hours → apply：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { VolunteerHourApplicationForm } from "@/components/hours/VolunteerHourApplicationForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireVolunteer } from "@/lib/auth";

export default async function VolunteerHourApplicationPage() {
  await requireVolunteer();

  return (
    <>
      <PageHeader description="申报未通过任务广场发布的志愿服务，审核通过后计入个人志愿时长。" title="申请志愿时长" />
      <VolunteerHourApplicationForm />
    </>
  );
}
