/** 项目导读：共享 AI 配置接口；只让超级管理员写凭据，任何响应都不把明文带出服务器。 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/app/api/_utils";
import { encryptSecret, getAiProviderStatus } from "@/lib/ai-provider-settings";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const providerSchema = z.literal("glm");
const updateSchema = z.object({
  provider: providerSchema,
  credential: z.string().trim().min(8, "凭据长度不能少于 8 个字符").max(1000, "凭据过长")
});

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await getAiProviderStatus() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth.response || !auth.user) return auth.response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "凭据格式无效" }, { status: 400 });

  try {
    const encrypted = encryptSecret(parsed.data.credential);
    const data = { encryptedApiKey: encrypted.encrypted, encryptionIv: encrypted.iv, authTag: encrypted.authTag, keyHint: encrypted.hint };
    const label = "GLM API Key";

    await prisma.$transaction(async (tx) => {
      await tx.aiProviderSetting.upsert({
        where: { id: 1 },
        create: { id: 1, provider: "shared", ...data, updatedById: auth.user!.id, updatedByName: auth.user!.name },
        update: { ...data, updatedById: auth.user!.id, updatedByName: auth.user!.name }
      });
      await tx.operationLog.create({
        data: { userId: auth.user!.id, action: `更新共享 ${label}`, targetType: "AiProviderSetting", targetId: "1", detail: `凭据标识：${encrypted.hint}` }
      });
    });
    return NextResponse.json({ data: await getAiProviderStatus(), message: `共享 ${label} 已保存` });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "保存凭据失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdminApi();
  if (auth.response || !auth.user) return auth.response;
  const parsed = providerSchema.safeParse(request.nextUrl.searchParams.get("provider"));
  if (!parsed.success) return NextResponse.json({ message: "缺少有效的凭据类型" }, { status: 400 });
  const label = "GLM API Key";

  await prisma.$transaction(async (tx) => {
    await tx.aiProviderSetting.updateMany({
      where: { id: 1 },
      data: { encryptedApiKey: null, encryptionIv: null, authTag: null, keyHint: null, updatedById: auth.user!.id, updatedByName: auth.user!.name }
    });
    await tx.operationLog.create({
      data: { userId: auth.user!.id, action: `清除共享 ${label}`, targetType: "AiProviderSetting", targetId: "1", detail: `已清除数据库凭据；若服务器配置了对应环境变量，将继续使用后备值` }
    });
  });
  return NextResponse.json({ data: await getAiProviderStatus(), message: `数据库中的共享 ${label} 已清除` });
}

async function requireSuperAdminApi() {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth;
  if (!isSuperAdmin(auth.user.role)) {
    return { user: auth.user, response: NextResponse.json({ message: "仅超级管理员可以维护 AI API 凭据" }, { status: 403 }) };
  }
  return auth;
}
