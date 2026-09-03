/** 项目导读：页面入口 volunteer → login：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { MockLoginForm } from "@/components/forms/MockLoginForm";

export default function VolunteerLoginPage() {
  return (
    <MockLoginForm
      allowedRoles={["volunteer"]}
      alternateHref="/admin/login"
      alternateLabel="前往管理员登录"
      title="志愿者登录"
    />
  );
}
