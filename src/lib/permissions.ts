/** 项目导读：角色权限映射：把用户身份翻译成可执行规则；头衔可以简写，权限不能自由发挥。 */
import type { Role } from "@/types/role";

export function isSuperAdmin(role?: Role | null) {
  return role === "super_admin";
}

export function isAdmin(role?: Role | null) {
  return role === "super_admin" || role === "admin";
}

export function isVolunteer(role?: Role | null) {
  return role === "volunteer";
}

export function canAccessAdmin(role?: Role | null) {
  return isAdmin(role);
}

export function canAccessSuperAdminOnly(role?: Role | null) {
  return isSuperAdmin(role);
}

export function getDefaultRouteByRole(role: Role) {
  if (isAdmin(role)) {
    return "/admin";
  }

  return "/volunteer";
}
