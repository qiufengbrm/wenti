/** 项目导读：页面入口 admin → profile：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdmin } from "@/lib/auth";

export default async function AdminProfilePage() {
  const user = await requireAdmin();

  return (
    <>
      <PageHeader description="查看并维护姓名、登录账号和登录密码。" title="个人信息" />
      <ProfileSettings
        initialData={{
          name: user.name,
          username: user.username,
          studentId: "",
          grade: "",
          major: "",
          className: "",
          phone: user.phone ?? "",
          qq: user.qq ?? "",
          wechat: user.wechat ?? "",
          skills: ""
        }}
        mode="admin"
        suggestedSkills={[]}
      />
    </>
  );
}
