/** 项目导读：全站布局组件：照看侧栏、顶栏、主题和导航反馈；路标清楚，用户才不用凭感觉回家。 */
import { Badge } from "@/components/ui/Badge";
import { BackButton } from "@/components/layout/BackButton";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { MessageBell } from "@/components/layout/MessageBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getUnreadMessageCount } from "@/lib/data";
import { roleLabels } from "@/types/role";
import type { CurrentUser } from "@/types/user";
import { MobileNav, type NavItem } from "@/components/layout/Sidebar";

export async function Header({ user, navItems, navTitle }: { user: CurrentUser; navItems: NavItem[]; navTitle: string }) {
  const loginHref = user.role === "volunteer" ? "/volunteer/login" : user.role === "admin" ? "/admin/login" : "/login";
  const messageHref = user.role === "volunteer" ? "/volunteer/messages" : "/admin/messages";
  const homeHref = user.role === "volunteer" ? "/volunteer" : "/admin";
  const unreadCount = await getUnreadMessageCount(user.id);

  return (
    <header className="mobile-safe-header apple-material sticky top-0 z-20 flex h-14 items-center justify-between gap-1 border-b border-black/[0.07] px-2 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-0.5 sm:gap-2">
        <MobileNav items={navItems} title={navTitle} />
        <BackButton homeHref={homeHref} />
        <div className="hidden min-w-0 min-[390px]:block">
        <p className="truncate text-[13px] font-semibold text-[#1d1d1f]">{user.name}</p>
        <p className="hidden text-[11px] text-[#86868b] sm:block">@{user.username}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-3">
        <ThemeToggle />
        <MessageBell href={messageHref} initialUnreadCount={unreadCount} />
        <span className="hidden sm:inline-flex"><Badge variant={user.role === "super_admin" ? "blue" : user.role === "admin" ? "green" : "gray"}>{roleLabels[user.role]}</Badge></span>
        <LogoutButton loginHref={loginHref} />
      </div>
    </header>
  );
}
