/** 项目导读：全站布局组件：照看侧栏、顶栏、主题和导航反馈；路标清楚，用户才不用凭感觉回家。 */
import { Header } from "@/components/layout/Header";
import { Sidebar, type NavItem } from "@/components/layout/Sidebar";
import { requireVolunteer } from "@/lib/auth";

const volunteerItems: NavItem[] = [
  { label: "首页", href: "/volunteer", icon: "gauge" },
  { label: "申请志愿时长", href: "/volunteer/hours/apply", icon: "filePlus" },
  { label: "我的课表", href: "/volunteer/schedule", icon: "calendar" },
  { label: "特长词云", href: "/volunteer/skills", icon: "sparkles" },
  { label: "任务广场", href: "/volunteer/tasks", icon: "clipboardList", hidden: true },
  { label: "我的志愿时长", href: "/volunteer/hours", icon: "history", hidden: true, exact: true },
  { label: "资料中心", href: "/volunteer/files", icon: "uploadCloud" },
  { label: "教程中心", href: "/volunteer/tutorials", icon: "bookOpen" },
  { label: "个人信息", href: "/volunteer/profile", icon: "user", last: true }
];

export async function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireVolunteer();

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <Sidebar items={volunteerItems} title="文体志愿者" />
      <div className="min-w-0 flex-1 lg:ml-64">
        <Header navItems={volunteerItems} navTitle="文体志愿者" user={user} />
        <main className="app-main mx-auto w-full max-w-[1440px] px-3 py-5 sm:px-6 sm:py-8 xl:px-10 xl:py-10">{children}</main>
      </div>
    </div>
  );
}
