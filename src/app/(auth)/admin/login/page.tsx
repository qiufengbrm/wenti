/** 项目导读：页面入口 admin → login：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { MockLoginForm } from "@/components/forms/MockLoginForm";

export default function AdminLoginPage() {
  return (
    <MockLoginForm
      allowedRoles={["admin"]}
      alternateHref="/volunteer/login"
      alternateLabel="前往志愿者登录"
      description="部门负责人使用独立入口登录。"
      title="管理员登录"
    />
  );
}
