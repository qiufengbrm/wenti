/** 项目导读：全站公告接口：所有页面可以读，只有超级管理员能碰总开关；喇叭公用，话筒不能乱抢。 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { getFloatingAnnouncement } from "@/lib/floating-announcement";
import { isSuperAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  content: z.string().trim().max(500, "公告内容不能超过 500 个字符"),
  enabled: z.boolean()
}).refine((value) => !value.enabled || value.content.length > 0, {
  message: "开启公告前请先填写内容",
  path: ["content"]
});

export async function GET() {
  const data = await getFloatingAnnouncement();
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  if (!isSuperAdmin(auth.user.role)) return NextResponse.json({ message: "仅超级管理员可以设置全站公告" }, { status: 403 });

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "公告设置无效" }, { status: 400 });

  const announcement = await prisma.$transaction(async (tx) => {
    const saved = await tx.floatingAnnouncement.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        content: parsed.data.content,
        isEnabled: parsed.data.enabled,
        updatedById: auth.user!.id,
        updatedByName: auth.user!.name
      },
      update: {
        content: parsed.data.content,
        isEnabled: parsed.data.enabled,
        updatedById: auth.user!.id,
        updatedByName: auth.user!.name
      }
    });

    await tx.operationLog.create({
      data: {
        userId: auth.user!.id,
        action: parsed.data.enabled ? "开启全站悬浮公告" : "关闭全站悬浮公告",
        targetType: "FloatingAnnouncement",
        targetId: String(saved.id),
        detail: parsed.data.enabled ? `公告内容：${parsed.data.content}` : "关闭全站悬浮公告"
      }
    });
    return saved;
  });

  return NextResponse.json({
    data: {
      content: announcement.content,
      enabled: announcement.isEnabled,
      updatedAt: announcement.updatedAt.toISOString(),
      updatedByName: announcement.updatedByName
    },
    message: announcement.isEnabled ? "全站悬浮公告已开启" : "全站悬浮公告已关闭"
  });
}
