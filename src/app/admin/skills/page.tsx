/** 项目导读：页面入口 admin → skills：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { VolunteerSkillCloud } from "@/components/volunteers/VolunteerManagement";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVolunteers } from "@/lib/data";

export default async function AdminSkillsPage() {
  const volunteers = await getVolunteers();

  return (
    <>
      <PageHeader description="浏览志愿者特长分布，点击词条查看擅长该项的同学。" title="特长词云" />
      <VolunteerSkillCloud volunteers={volunteers} viewer="admin" />
    </>
  );
}
