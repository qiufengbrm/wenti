/** 项目导读：类型定义 role：给数据形状立规矩；TypeScript 先把话说明白，运行时就少一点鸡同鸭讲。 */
export type Role = "super_admin" | "admin" | "volunteer";

export type UserStatus = "active" | "disabled" | "pending";

export const roleLabels: Record<Role, string> = {
  super_admin: "超级管理员",
  admin: "部门负责人",
  volunteer: "普通志愿者"
};
