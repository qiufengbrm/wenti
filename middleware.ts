/** 项目导读：请求入口门卫：在页面加载前检查访问条件；门可以开得快，身份不能看得糊。 */
import { NextResponse, type NextRequest } from "next/server";
import { authCookieName } from "@/lib/auth-constants";
import { canAccessAdmin, canAccessSuperAdminOnly, getDefaultRouteByRole } from "@/lib/permissions";
import { decodeSession } from "@/lib/session";
import type { Role } from "@/types/role";

const protectedPrefixes = ["/dashboard", "/admin", "/volunteer"];
const superAdminOnlyPrefixes = ["/admin/accounts", "/admin/settings"];
const publicLoginPaths = ["/login", "/admin/login", "/volunteer/login", "/superadmin/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionValue = request.cookies.get(authCookieName)?.value;
  const role = getRoleFromSessionValue(sessionValue);

  if (publicLoginPaths.includes(pathname)) {
    if (role && pathname !== "/login") {
      return NextResponse.redirect(new URL(getDefaultRouteByRole(role), request.url));
    }

    return NextResponse.next();
  }

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!role) {
    const loginPath = pathname.startsWith("/volunteer") ? "/volunteer/login" : "/admin/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL(getDefaultRouteByRole(role), request.url));
  }

  if (pathname.startsWith("/admin") && !canAccessAdmin(role)) {
    return NextResponse.redirect(new URL("/volunteer", request.url));
  }

  if (pathname.startsWith("/volunteer") && canAccessAdmin(role)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (superAdminOnlyPrefixes.some((prefix) => pathname.startsWith(prefix)) && !canAccessSuperAdminOnly(role)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

function getRoleFromSessionValue(sessionValue?: string): Role | undefined {
  return decodeSession(sessionValue)?.role;
}

export const config = {
  matcher: ["/login", "/superadmin/login", "/dashboard/:path*", "/admin/:path*", "/volunteer/:path*"]
};
