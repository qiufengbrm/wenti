/** 项目导读：页面入口 admin → volunteers：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { VolunteerManagement } from "@/components/volunteers/VolunteerManagement";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVolunteers } from "@/lib/data";

export default async function AdminVolunteersPage() {
  const volunteers = await getVolunteers();

  return (
    <>
      <PageHeader description="快速检索志愿者，查看资料完整度、账号状态和服务信息。" title="志愿者管理" />
      <VolunteerManagement volunteers={volunteers} />
    </>
  );
}
