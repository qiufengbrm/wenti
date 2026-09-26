/** 项目导读：共享 AI 凭据的加密仓库；超级管理员管钥匙，业务服务只在真正调用时短暂解密。 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const settingId = 1;
const algorithm = "aes-256-gcm";

export interface CredentialStatus {
  configured: boolean;
  source: "database" | "environment" | "none";
  maskedValue: string | null;
}

export interface AiProviderStatus {
  glm: CredentialStatus;
  updatedAt: string | null;
  updatedByName: string | null;
  encryptionReady: boolean;
}

export async function getAiProviderStatus(): Promise<AiProviderStatus> {
  const setting = await prisma.aiProviderSetting.findUnique({ where: { id: settingId } });
  const glmEnvironment = process.env.GLM_API_KEY?.trim();
  return {
    glm: credentialStatus(Boolean(setting?.encryptedApiKey), setting?.keyHint ?? null, glmEnvironment),
    updatedAt: setting?.updatedAt.toISOString() ?? null,
    updatedByName: setting?.updatedByName ?? null,
    encryptionReady: hasEncryptionKey()
  };
}

export async function getSharedGlmApiKey() {
  const setting = await prisma.aiProviderSetting.findUnique({ where: { id: settingId } });
  if (setting?.encryptedApiKey && setting.encryptionIv && setting.authTag) {
    return decryptSecret({ encrypted: setting.encryptedApiKey, iv: setting.encryptionIv, authTag: setting.authTag }, "GLM API Key");
  }
  const fallback = process.env.GLM_API_KEY?.trim();
  if (fallback) return fallback;
  throw new Error("系统尚未配置 GLM API Key，请联系超级管理员在“系统设置”中完成配置");
}

export function encryptSecret(value: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    hint: maskSecret(value)
  };
}

function decryptSecret(value: { encrypted: string; iv: string; authTag: string }, label: string) {
  try {
    const decipher = createDecipheriv(algorithm, getEncryptionKey(), Buffer.from(value.iv, "base64"));
    decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(value.encrypted, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error(`已保存的 ${label} 无法解密，请超级管理员重新保存配置`);
  }
}

export function hasEncryptionKey() {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

function credentialStatus(hasDatabaseValue: boolean, hint: string | null, environmentValue: string | undefined): CredentialStatus {
  if (hasDatabaseValue) return { configured: true, source: "database", maskedValue: hint };
  if (environmentValue) return { configured: true, source: "environment", maskedValue: maskSecret(environmentValue) };
  return { configured: false, source: "none", maskedValue: null };
}

function getEncryptionKey() {
  const raw = process.env.AI_SETTINGS_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("服务器尚未配置 AI_SETTINGS_ENCRYPTION_KEY");
  const key = /^[a-f\d]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("AI_SETTINGS_ENCRYPTION_KEY 必须是 32 字节的 Base64 或 64 位十六进制字符串");
  return key;
}

function maskSecret(value: string) {
  if (value.length <= 8) return `••••${value.slice(-4)}`;
  return `${value.slice(0, 3)}••••••${value.slice(-4)}`;
}
