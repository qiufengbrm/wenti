/** 项目导读：全站布局组件：照看侧栏、顶栏、主题和导航反馈；路标清楚，用户才不用凭感觉回家。 */
"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearLoginSession } from "@/components/auth/SessionGuard";
import { authCookieName } from "@/lib/auth-constants";

export function LogoutButton({ loginHref = "/login" }: { loginHref?: string }) {
  const router = useRouter();

  function logout() {
    document.cookie = `${authCookieName}=; path=/; max-age=0`;
    clearLoginSession();
    router.push(loginHref);
    router.refresh();
  }

  function requestLogout() {
    const navigationEvent = new CustomEvent("app:request-navigation", { cancelable: true, detail: { continueNavigation: logout } });
    if (window.dispatchEvent(navigationEvent)) logout();
  }

  return (
    <button
      aria-label="退出登录"
      className="inline-flex size-11 items-center justify-center gap-2 rounded-[10px] text-[13px] font-medium text-[#515154] transition-colors hover:bg-black/[0.055] hover:text-[#1d1d1f] sm:h-9 sm:w-auto sm:px-3"
      onClick={requestLogout}
      type="button"
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">退出登录</span>
    </button>
  );
}
