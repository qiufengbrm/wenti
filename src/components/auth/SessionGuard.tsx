/** 项目导读：前端会话守卫：负责页面侧的登录状态体验；真正的权限仍由服务端把关，不能只靠门帘挡风。 */
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authCookieName } from "@/lib/auth-constants";

const tabSessionKey = "wenti_tab_session_active";
const rememberKey = "wenti_remember_login";

const publicPaths = ["/login", "/admin/login", "/volunteer/login", "/superadmin/login"];

export function SessionGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (publicPaths.includes(pathname)) {
      return;
    }

    if (!document.cookie.includes(`${authCookieName}=`)) {
      return;
    }

    const remembered = window.localStorage.getItem(rememberKey) === "1";
    const tabSessionActive = window.sessionStorage.getItem(tabSessionKey) === "1";

    if (remembered || tabSessionActive) {
      return;
    }

    document.cookie = `${authCookieName}=; path=/; max-age=0`;
    router.replace(getLoginPath(pathname));
    router.refresh();
  }, [pathname, router]);

  return null;
}

export function markLoginSession(remember: boolean) {
  if (remember) {
    window.localStorage.setItem(rememberKey, "1");
    window.sessionStorage.removeItem(tabSessionKey);
    return;
  }

  window.localStorage.removeItem(rememberKey);
  window.sessionStorage.setItem(tabSessionKey, "1");
}

export function clearLoginSession() {
  window.localStorage.removeItem(rememberKey);
  window.sessionStorage.removeItem(tabSessionKey);
}

function getLoginPath(pathname: string) {
  if (pathname.startsWith("/volunteer")) {
    return "/volunteer/login";
  }

  return "/admin/login";
}
