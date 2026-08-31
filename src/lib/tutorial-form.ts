/** 项目导读：教程业务工具：统一整理表单和附件存储；草稿与发布各走各路，免得半成品抢先登台。 */
import type { NextRequest } from "next/server";
import { validateResourceName } from "@/lib/resource-drive";
import { MAX_TUTORIAL_ATTACHMENT_SIZE } from "@/lib/resource-storage";
import { extractTutorialInlineImageIds, isTutorialContentEmpty, MAX_TUTORIAL_CONTENT_LENGTH, MAX_TUTORIAL_INLINE_IMAGES, sanitizeTutorialHtml } from "@/lib/tutorial-content";

export async function readTutorialForm(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { error: "无法读取教程内容", status: 400 } as const;
  }

  const title = textValue(form, "title").slice(0, 150);
  const content = sanitizeTutorialHtml(textValue(form, "content"));
  const inlineImageIds = extractTutorialInlineImageIds(content);
  const category = textValue(form, "category").slice(0, 50);
  const tags = textValue(form, "tags").slice(0, 500) || null;
  const visibilityValue = textValue(form, "visibility");
  const statusValue = textValue(form, "status");
  const visibility = ["ALL", "ADMINS", "VOLUNTEERS"].includes(visibilityValue) ? visibilityValue as "ALL" | "ADMINS" | "VOLUNTEERS" : null;
  const tutorialStatus = ["DRAFT", "PUBLISHED"].includes(statusValue) ? statusValue as "DRAFT" | "PUBLISHED" : null;
  const attachmentValue = form.get("attachment");
  const attachment = attachmentValue instanceof File && attachmentValue.size > 0 ? attachmentValue : null;
  const attachmentName = attachment ? validateResourceName(attachment.name) : null;

  if (!title) return { error: "请填写教程标题", status: 400 } as const;
  if (!category) return { error: "请选择教程分类", status: 400 } as const;
  if (!visibility) return { error: "请选择有效的可见范围", status: 400 } as const;
  if (!tutorialStatus) return { error: "请选择保存草稿或发布教程", status: 400 } as const;
  if (content.length > MAX_TUTORIAL_CONTENT_LENGTH) return { error: "教程正文排版内容过长，请精简后再保存", status: 413 } as const;
  if (inlineImageIds.length > MAX_TUTORIAL_INLINE_IMAGES) return { error: `每篇教程最多插入 ${MAX_TUTORIAL_INLINE_IMAGES} 张图片`, status: 413 } as const;
  if (tutorialStatus === "PUBLISHED" && isTutorialContentEmpty(content)) return { error: "发布教程前请填写教程内容", status: 400 } as const;
  if (attachment && !attachmentName) return { error: "附件文件名无效", status: 400 } as const;
  if (attachment && attachment.size > MAX_TUTORIAL_ATTACHMENT_SIZE) return { error: "教程附件不能超过 100MB", status: 413 } as const;

  return {
    title,
    content,
    inlineImageIds,
    category,
    tags,
    visibility,
    statusValue: tutorialStatus,
    isPinned: textValue(form, "isPinned") === "true",
    removeAttachment: textValue(form, "removeAttachment") === "true",
    attachment,
    attachmentName
  };
}

function textValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
