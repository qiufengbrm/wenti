/** 项目导读：登录与会话工具：识别当前用户并约束访问范围；身份信息宁可多核一次，不能靠眼熟放行。 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName } from "@/lib/auth-constants";
import { prisma } from "@/lib/db";
import { canAccessAdmin, canAccessSuperAdminOnly, isVolunteer } from "@/lib/permissions";
import { toAppRole } from "@/lib/role-map";
import { decodeSession } from "@/lib/session";
import type { CurrentUser } from "@/types/user";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(authCookieName)?.value);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id }
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: toAppRole(user.role),
    status: "active",
    mustChangePassword: user.mustChangePassword,
    studentId: user.studentId ?? undefined,
    phone: user.phone ?? undefined,
    qq: user.qq ?? undefined,
    wechat: user.wechat ?? undefined,
    grade: user.grade ?? undefined,
    major: user.major ?? undefined,
    className: user.className ?? undefined
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!canAccessAdmin(user.role)) {
    redirect("/volunteer");
  }

  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAdmin();

  if (!canAccessSuperAdminOnly(user.role)) {
    redirect("/admin");
  }

  return user;
}

export async function requireVolunteer() {
  const user = await requireUser();

  if (!isVolunteer(user.role)) {
    redirect("/admin");
  }

  return user;
}
