/** 项目导读：接口路由 /api/auth：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { authCookieName } from "@/lib/auth-constants";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { getDefaultRouteByRole } from "@/lib/permissions";
import { toAppRole } from "@/lib/role-map";
import { encodeSession } from "@/lib/session";
import type { Role } from "@/types/role";

export async function GET() {
  return NextResponse.json({
    message: "Auth 接口。当前使用 Prisma + MySQL 自定义登录。",
    loginEntrances: {
      admin: "/admin/login",
      volunteer: "/volunteer/login",
      superAdmin: "独立保留地址，不在页面中公开跳转"
    }
  });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
    allowedRoles?: Role[];
    rememberMe?: boolean;
  };

  const username = payload.username?.trim();
  const password = payload.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ message: "请输入账号和密码" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || user.status !== "ACTIVE" || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ message: "账号或密码不正确，请确认登录入口是否正确。" }, { status: 401 });
  }

  const role = toAppRole(user.role);

  if (payload.allowedRoles?.length && !payload.allowedRoles.includes(role)) {
    return NextResponse.json({ message: "账号角色与当前登录入口不匹配。" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role,
      mustChangePassword: user.mustChangePassword
    },
    redirectTo: getDefaultRouteByRole(role)
  });

  response.cookies.set(authCookieName, encodeSession({ id: user.id, username: user.username, role }), {
    httpOnly: false,
    maxAge: payload.rememberMe ? 60 * 60 * 24 * 7 : undefined,
    path: "/",
    sameSite: "lax"
  });

  return response;
}
