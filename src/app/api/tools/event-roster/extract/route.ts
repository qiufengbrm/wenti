/** 项目导读：原始赛事文件直传 GLM；校验文件边界后保留完整版面进行结构化提取。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { validateRosterEvents } from "@/lib/event-roster/validation";
import { extractEventsFromFiles, type GlmSourceFile } from "@/services/ai/glm-event-extraction";

export const runtime = "nodejs";
export const maxDuration = 300;

const maxFileSize = 20 * 1024 * 1024;
const maxTotalSize = 50 * 1024 * 1024;
const maxFiles = 8;
const supported = new Map<string, GlmSourceFile["mimeType"]>([
  ["pdf", "application/pdf"],
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["ppt", "application/vnd.ms-powerpoint"],
  ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]
]);

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
    const instructionsValue = formData.get("instructions");
    const instructions = typeof instructionsValue === "string" ? instructionsValue.trim() : "";
    if (instructions.length > 2_000) return NextResponse.json({ message: "本次识别要求不能超过 2000 个字符" }, { status: 400 });
    if (files.length === 0) return NextResponse.json({ message: "请至少选择一个赛事资料文件" }, { status: 400 });
    if (files.length > maxFiles) return NextResponse.json({ message: `一次最多上传 ${maxFiles} 个文件` }, { status: 400 });
    if (files.reduce((total, file) => total + file.size, 0) > maxTotalSize) return NextResponse.json({ message: "直接分析时单次上传总大小不能超过 50MB" }, { status: 400 });

    const sourceFiles: GlmSourceFile[] = [];
    for (const file of files) {
      const validation = await validateFile(file);
      if (validation) return NextResponse.json({ message: validation }, { status: 400 });
      sourceFiles.push({ name: safeDisplayName(file.name), mimeType: normalizedMime(file.name), data: Buffer.from(await file.arrayBuffer()) });
    }
    const { events, suggestedTitle } = await extractEventsFromFiles(sourceFiles, instructions);
    if (events.length === 0) return NextResponse.json({ message: "AI 没有识别到属于生科院的赛事，请检查文件内容或补充本次识别要求" }, { status: 422 });
    return NextResponse.json({ events, suggestedTitle, issues: validateRosterEvents(events) });
  } catch (error) {
    console.error("event file extraction failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "赛事分析失败，请稍后重试" }, { status: 502 });
  }
}

async function validateFile(file: File) {
  if (file.size <= 0) return `${file.name} 是空文件`;
  if (file.size > maxFileSize) return `${file.name} 超过 20MB 限制`;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = supported.get(extension);
  if (!expectedMime) return `${file.name} 的文件类型不受支持`;
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const valid = extension === "pdf"
    ? startsWith(signature, [0x25, 0x50, 0x44, 0x46])
    : extension === "png"
      ? startsWith(signature, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      : extension === "jpg" || extension === "jpeg"
        ? startsWith(signature, [0xff, 0xd8, 0xff])
        : extension.endsWith("x")
          ? startsWith(signature, [0x50, 0x4b])
          : startsWith(signature, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  return valid ? null : `${file.name} 的文件内容与类型不匹配`;
}

function normalizedMime(name: string): GlmSourceFile["mimeType"] {
  const extension = name.split(".").pop()?.toLowerCase();
  const mimeType = extension ? supported.get(extension) : undefined;
  if (!mimeType) throw new Error(`${name} 的文件类型不受支持`);
  return mimeType;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function safeDisplayName(value: string) {
  return value.replace(/^.*[\\/]/, "").replace(/[\u0000-\u001f]/g, "").slice(0, 255) || "未命名文件";
}
