/** 项目导读：角色权限映射：把用户身份翻译成可执行规则；头衔可以简写，权限不能自由发挥。 */
import type { Role } from "@/types/role";

export function toAppRole(role: string): Role {
  if (role === "SUPER_ADMIN") return "super_admin";
  if (role === "ADMIN") return "admin";
  return "volunteer";
}

export function toDbRole(role: Role) {
  if (role === "super_admin") return "SUPER_ADMIN";
  if (role === "admin") return "ADMIN";
  return "VOLUNTEER";
}
