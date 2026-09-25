import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { isVolunteer } from "@/lib/permissions";
import { requireSameOrigin } from "@/lib/request-security";
import { authorizeAndSync, refreshCampusSchedule } from "@/lib/ccnu-sync";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  if (!isVolunteer(auth.user.role)) return NextResponse.json({ message: "仅成员可授权自己的课表" }, { status: 403 });
  const input = await request.json().catch(() => ({})) as { username?: string; password?: string; term?: string };
  if (!input.username || !input.password || !/^\d{4}-\d{4}-[12]$/.test(input.term ?? "")) return NextResponse.json({ message: "请输入校内账号、密码与学期" }, { status: 400 });
  try {
    const count = await authorizeAndSync(auth.user.id, auth.user.studentId ?? "", input.username.trim(), input.password, input.term!);
    return NextResponse.json({ message: `同步成功，共 ${count} 门课程`, count });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "同步失败" }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  if (!isVolunteer(auth.user.role)) return NextResponse.json({ message: "仅成员可同步自己的课表" }, { status: 403 });
  const input = await request.json().catch(() => ({})) as { term?: string };
  if (!/^\d{4}-\d{4}-[12]$/.test(input.term ?? "")) return NextResponse.json({ message: "学期格式无效" }, { status: 400 });
  try {
    const count = await refreshCampusSchedule(auth.user.id, input.term!);
    return NextResponse.json({ message: `同步成功，共 ${count} 门课程`, count });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "同步失败" }, { status: 400 });
  }
}
