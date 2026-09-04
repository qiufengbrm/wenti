/** 项目导读：资料中心 OSS 适配层：仅管理 resource-center/ 前缀，密钥始终留在服务端。 */
import { stat } from "node:fs/promises";
import path from "node:path";
import OSS from "ali-oss";

type OssHeaders = Record<string, string | string[] | undefined>;

let internalClient: OSS | null = null;
let publicClient: OSS | null = null;

export function isResourceObjectStorageEnabled() {
  const values = [
    process.env.OSS_BUCKET,
    process.env.OSS_REGION,
    process.env.OSS_ENDPOINT,
    process.env.OSS_ACCESS_KEY_ID,
    process.env.OSS_ACCESS_KEY_SECRET
  ];
  if (!values.some((value) => value?.trim())) return false;
  getOssConfig();
  return true;
}

export function isResourceObjectKey(storageKey?: string | null) {
  if (!storageKey) return false;
  return storageKey.startsWith(`${getObjectPrefix()}/`);
}

export function createResourceObjectKey(kind: "originals" | "previews", id: string, fileName: string) {
  const name = safeObjectName(fileName);
  return `${getObjectPrefix()}/${kind}/${id}/${name}`;
}

export async function putResourceObjectFromPath(storageKey: string, absolutePath: string, contentType: string) {
  assertResourceObjectKey(storageKey);
  const details = await stat(absolutePath);
  if (!details.isFile()) throw new Error("待上传的资料文件不存在");
  await getInternalClient().put(storageKey, absolutePath, {
    mime: contentType || "application/octet-stream",
    headers: {
      "x-oss-forbid-overwrite": "true"
    }
  });
  return { storageKey, size: details.size };
}

export async function getResourceObjectMetadata(storageKey: string) {
  assertResourceObjectKey(storageKey);
  const result = await getInternalClient().head(storageKey);
  const headers = result.res.headers as OssHeaders;
  const size = Number(headerValue(headers, "content-length"));
  if (!Number.isSafeInteger(size) || size < 0) throw new Error("OSS 资料大小无效");
  return { size };
}

export async function getResourceObjectStream(storageKey: string, range?: { start: number; end: number }) {
  assertResourceObjectKey(storageKey);
  const result = await getInternalClient().getStream(storageKey, {
    headers: range ? { Range: `bytes=${range.start}-${range.end}` } : undefined
  });
  if (!result.stream) throw new Error("OSS 资料文件不存在");
  return { stream: result.stream as NodeJS.ReadableStream };
}

export async function resourceObjectExists(storageKey?: string | null) {
  if (!storageKey || !isResourceObjectKey(storageKey)) return false;
  try {
    await getInternalClient().head(storageKey);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function removeResourceObjects(keys: Array<string | null | undefined>) {
  const names = Array.from(new Set(keys.filter((key): key is string => Boolean(key) && isResourceObjectKey(key))));
  if (!names.length) return;
  for (let index = 0; index < names.length; index += 1000) {
    await getInternalClient().deleteMulti(names.slice(index, index + 1000), { quiet: true });
  }
}

export async function createSignedResourceDownloadUrl(storageKey: string, fileName: string, contentType?: string | null) {
  assertResourceObjectKey(storageKey);
  return getPublicClient().signatureUrlV4(
    "GET",
    300,
    {
      queries: {
        "response-content-disposition": contentDisposition(fileName),
        "response-content-type": contentType || "application/octet-stream"
      }
    },
    storageKey
  );
}

function getInternalClient() {
  if (!internalClient) internalClient = createClient(false);
  return internalClient;
}

function getPublicClient() {
  if (!publicClient) publicClient = createClient(true);
  return publicClient;
}

function createClient(usePublicEndpoint: boolean) {
  const config = getOssConfig();
  return new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    endpoint: usePublicEndpoint ? config.publicEndpoint : config.endpoint,
    region: config.region,
    authorizationV4: true,
    secure: true,
    timeout: 120_000
  });
}

function getOssConfig() {
  const credentialType = process.env.OSS_CREDENTIAL_TYPE?.trim() || "access_key";
  if (credentialType !== "access_key") throw new Error(`资料中心暂不支持 OSS 凭证类型：${credentialType}`);
  const bucket = requiredEnv("OSS_BUCKET");
  const region = requiredEnv("OSS_REGION");
  const endpoint = normalizeEndpoint(requiredEnv("OSS_ENDPOINT"));
  const configuredPublicEndpoint = process.env.OSS_PUBLIC_ENDPOINT?.trim();
  const publicEndpoint = normalizeEndpoint(configuredPublicEndpoint || endpoint.replace("-internal.aliyuncs.com", ".aliyuncs.com"));
  if (publicEndpoint.includes("-internal.")) throw new Error("OSS_PUBLIC_ENDPOINT 不能使用内网地址");
  return {
    bucket,
    region,
    endpoint,
    publicEndpoint,
    accessKeyId: requiredEnv("OSS_ACCESS_KEY_ID"),
    accessKeySecret: requiredEnv("OSS_ACCESS_KEY_SECRET")
  };
}

function getObjectPrefix() {
  const value = process.env.OSS_PREFIX?.trim().replace(/^\/+|\/+$/g, "") || "resource-center";
  if (!value || value.includes("..") || /[\\\u0000-\u001f]/.test(value)) throw new Error("OSS_PREFIX 无效");
  return value;
}

function assertResourceObjectKey(storageKey: string) {
  if (!isResourceObjectKey(storageKey) || storageKey.includes("..") || storageKey.startsWith("/")) throw new Error("非法 OSS 资料路径");
}

function safeObjectName(fileName: string) {
  const name = path.basename(fileName).trim().replace(/[\\/\u0000-\u001f]/g, "_");
  return !name || name === "." || name === ".." ? "unnamed-file" : name;
}

function normalizeEndpoint(value: string) {
  const endpoint = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return endpoint.replace(/\/+$/, "");
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`未配置 ${name}`);
  return value;
}

function headerValue(headers: OssHeaders, name: string) {
  const entry = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(entry) ? entry[0] : entry;
}

function isNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { status?: number; statusCode?: number; code?: string };
  return value.status === 404 || value.statusCode === 404 || value.code === "NoSuchKey";
}

function contentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
