/** 项目导读：类型定义 user：给数据形状立规矩；TypeScript 先把话说明白，运行时就少一点鸡同鸭讲。 */
import type { Role, UserStatus } from "./role";

export interface CurrentUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: Role;
  status: UserStatus;
  mustChangePassword?: boolean;
  studentId?: string;
  phone?: string;
  qq?: string;
  wechat?: string;
  grade?: string;
  major?: string;
  className?: string;
}

export interface VolunteerUser extends CurrentUser {
  studentId: string;
  grade: string;
  major: string;
  className: string;
  phone?: string;
}
