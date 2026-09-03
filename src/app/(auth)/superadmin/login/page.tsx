/** 项目导读：页面入口 superadmin → login：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { MockLoginForm } from "@/components/forms/MockLoginForm";

export const dynamic = "force-dynamic";

export default function SuperAdminLoginPage() {
  return (
    <MockLoginForm
      allowedRoles={["super_admin"]}
      title="超级管理员登录"
    />
  );
}
