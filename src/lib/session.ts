/** 项目导读：登录与会话工具：识别当前用户并约束访问范围；身份信息宁可多核一次，不能靠眼熟放行。 */
import type { Role } from "@/types/role";

export interface SessionPayload {
  id: string;
  username: string;
  role: Role;
}

export function encodeSession(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeSession(value?: string): SessionPayload | null {
  if (!value) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.id || !payload.username || !payload.role) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
