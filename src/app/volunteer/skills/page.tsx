/** 项目导读：页面入口 volunteer → skills：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { VolunteerSkillCloud } from "@/components/volunteers/VolunteerManagement";
import { PageHeader } from "@/components/ui/PageHeader";
import { getVolunteers } from "@/lib/data";

export default async function VolunteerSkillsPage() {
  const volunteers = await getVolunteers();

  return (
    <>
      <PageHeader description="发现身边同学的隐藏技能，点击词条看看谁擅长这一项。" title="特长词云" />
      <VolunteerSkillCloud volunteers={volunteers} viewer="volunteer" />
    </>
  );
}
