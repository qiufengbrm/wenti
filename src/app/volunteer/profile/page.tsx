/** 项目导读：页面入口 volunteer → profile：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireVolunteer } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function VolunteerProfilePage() {
  const user = await requireVolunteer();
  const [profile, profiles] = await Promise.all([
    prisma.volunteerProfile.findUnique({ where: { userId: user.id } }),
    prisma.volunteerProfile.findMany({
      where: { user: { role: "VOLUNTEER" } },
      select: { skills: true }
    })
  ]);
  const suggestedSkills = Array.from(new Set(
    profiles.flatMap((item) => item.skills?.split(/[、,，;；/\n]+/).map((skill) => skill.trim()).filter(Boolean) ?? [])
  )).sort((first, second) => first.localeCompare(second, "zh-CN"));

  return (
    <>
      <PageHeader description="查看并维护个人、学籍、联系方式和特长资料。" title="个人信息" />
      <ProfileSettings
        initialData={{
          name: user.name,
          username: user.username,
          studentId: user.studentId ?? "",
          grade: user.grade ?? "",
          major: user.major ?? "",
          className: user.className ?? "",
          phone: user.phone ?? "",
          qq: user.qq ?? "",
          wechat: user.wechat ?? "",
          skills: profile?.skills ?? ""
        }}
        suggestedSkills={suggestedSkills}
      />
    </>
  );
}
