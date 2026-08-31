/** 项目导读：全站布局组件：照看侧栏、顶栏、主题和导航反馈；路标清楚，用户才不用凭感觉回家。 */
import { Header } from "@/components/layout/Header";
import { Sidebar, type NavItem } from "@/components/layout/Sidebar";
import { requireAdmin } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";

const baseItems: NavItem[] = [
  { label: "首页", href: "/admin", icon: "gauge" },
  { label: "志愿者管理", href: "/admin/volunteers", icon: "users" },
  { label: "特长词云", href: "/admin/skills", icon: "sparkles" },
  { label: "课表管理", href: "/admin/schedules", icon: "calendar" },
  { label: "任务管理", href: "/admin/tasks", icon: "clipboardList", hidden: true },
  { label: "资料中心", href: "/admin/files", icon: "uploadCloud" },
  { label: "志愿时长管理", href: "/admin/hours", icon: "history" },
  { label: "教程管理", href: "/admin/tutorials", icon: "bookOpen" },
  { label: "个人信息", href: "/admin/profile", icon: "user", last: true }
];

const superAdminItems: NavItem[] = [
  { label: "账号管理", href: "/admin/accounts", icon: "userCog" },
  { label: "系统设置", href: "/admin/settings", icon: "settings" }
];

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const items = isSuperAdmin(user.role) ? [...baseItems, ...superAdminItems] : baseItems;

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar items={items} title="文艺体育中心" />
      <div className="min-w-0 flex-1 lg:ml-64">
        <Header navItems={items} navTitle="文艺体育中心" user={user} />
        <main className="app-main mx-auto w-full max-w-[1440px] px-3 py-5 sm:px-6 sm:py-8 xl:px-10 xl:py-10">{children}</main>
      </div>
    </div>
  );
}
