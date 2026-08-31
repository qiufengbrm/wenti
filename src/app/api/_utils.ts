/** 项目导读：项目模块 _utils：说明本文件的核心职责，方便后来人少走弯路，也少对着代码掐指一算。 */
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/permissions";

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, response: NextResponse.json({ message: "未登录" }, { status: 401 }) };
  }

  return { user, response: null };
}

export async function requireApiAdmin() {
  const auth = await requireApiUser();

  if (auth.response || !auth.user) {
    return auth;
  }

  if (!canAccessAdmin(auth.user.role)) {
    return { user: auth.user, response: NextResponse.json({ message: "无权访问管理员接口" }, { status: 403 }) };
  }

  return { user: auth.user, response: null };
}

export function createCrudHandlers(moduleName: string, options: { adminOnly?: boolean } = {}) {
  async function check() {
    return options.adminOnly ? requireApiAdmin() : requireApiUser();
  }

  return {
    async GET() {
      const auth = await check();
      if (auth.response) return auth.response;

      return NextResponse.json({
        module: moduleName,
        action: "list",
        data: [],
        message: `${moduleName} 列表接口占位，后续接入数据库查询`
      });
    },
    async POST(request: NextRequest) {
      const auth = await check();
      if (auth.response) return auth.response;

      const payload = await safeJson(request);
      return NextResponse.json({
        module: moduleName,
        action: "create",
        payload,
        message: `${moduleName} 创建接口占位，后续接入表单校验和数据库写入`
      });
    },
    async PUT(request: NextRequest) {
      const auth = await check();
      if (auth.response) return auth.response;

      const payload = await safeJson(request);
      return NextResponse.json({
        module: moduleName,
        action: "update",
        payload,
        message: `${moduleName} 更新接口占位，后续接入权限和数据库更新`
      });
    },
    async DELETE() {
      const auth = await check();
      if (auth.response) return auth.response;

      return NextResponse.json({
        module: moduleName,
        action: "delete",
        message: `${moduleName} 删除或归档接口占位`
      });
    }
  };
}

async function safeJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
