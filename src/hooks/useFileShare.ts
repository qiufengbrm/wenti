/** 项目导读：移动端文件分享统一入口；只从现有鉴权下载接口取文件，不另开权限后门。 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_MAX_SHARE_BYTES = 100 * 1024 * 1024;

export type FileShareRequest = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
};

type ShareState = "idle" | "preparing" | "ready" | "sharing" | "error";

export type UseFileShareOptions = {
  url: string;
  fileName?: string;
  request?: FileShareRequest;
  cacheKey?: string;
  maxBytes?: number;
  onDownloadFallback?: () => void;
};

export function useFileShare({
  url,
  fileName,
  request,
  cacheKey = "",
  maxBytes = DEFAULT_MAX_SHARE_BYTES,
  onDownloadFallback
}: UseFileShareOptions) {
  const [state, setState] = useState<ShareState>("idle");
  const [message, setMessage] = useState("");
  const preparedFile = useRef<File | null>(null);

  useEffect(() => {
    preparedFile.current = null;
    setState("idle");
    setMessage("");
  }, [cacheKey, fileName, url]);

  const fallbackToDownload = useCallback((blob?: Blob, resolvedName?: string) => {
    if (blob) {
      downloadBlob(blob, resolvedName || fileName || "download");
      return true;
    } else if (onDownloadFallback) {
      onDownloadFallback();
      return true;
    }
    // 不直接打开下载接口：接口错误时，移动浏览器会离开当前页面并显示裸 JSON。
    // 页面原有下载入口仍然保留，由用户明确点击后再执行下载。
    return false;
  }, [fileName, onDownloadFallback]);

  const sharePreparedFile = useCallback(async (file: File) => {
    try {
      setState("sharing");
      setMessage("");
      await navigator.share({ files: [file], title: file.name });
      preparedFile.current = null;
      setState("idle");
    } catch (error) {
      if (isDomException(error, "AbortError")) {
        setState("ready");
        setMessage("已取消发送，可再次点击");
        return;
      }
      if (isDomException(error, "NotAllowedError")) {
        setState("ready");
        setMessage("文件已准备好，请再次点击发送");
        return;
      }
      setState("error");
      setMessage(error instanceof Error ? error.message : "文件发送失败，请稍后重试");
    }
  }, []);

  const share = useCallback(async () => {
    if (state === "preparing" || state === "sharing") return;

    if (preparedFile.current) {
      await sharePreparedFile(preparedFile.current);
      return;
    }

    const canUseNativeFileShare = window.isSecureContext
      && typeof navigator.share === "function"
      && typeof navigator.canShare === "function";

    setState("preparing");
    setMessage("");
    try {
      const response = await fetch(url, {
        method: request?.method || "GET",
        headers: request?.headers,
        body: request?.body,
        credentials: "same-origin",
        cache: "no-store"
      });
      if (!response.ok) throw new Error(await responseError(response));

      const declaredSize = Number(response.headers.get("Content-Length"));
      const sourceSize = Number(response.headers.get("X-File-Source-Size"));
      if ((Number.isFinite(declaredSize) && declaredSize > maxBytes) || (Number.isFinite(sourceSize) && sourceSize > maxBytes)) {
        await response.body?.cancel();
        const downloaded = fallbackToDownload();
        setState("idle");
        setMessage(downloaded
          ? `文件超过 ${formatSize(maxBytes)}，已改为下载，避免占满手机内存`
          : `文件超过 ${formatSize(maxBytes)}，请使用原下载按钮，避免占满手机内存`);
        return;
      }

      const blob = await response.blob();
      const resolvedName = responseFileName(response, fileName || "download");
      if (blob.size > maxBytes) {
        fallbackToDownload(blob, resolvedName);
        setState("idle");
        setMessage(`文件超过 ${formatSize(maxBytes)}，已改为下载，避免重复占用内存`);
        return;
      }

      if (!canUseNativeFileShare) {
        fallbackToDownload(blob, resolvedName);
        setState("idle");
        setMessage(window.isSecureContext
          ? "当前浏览器不支持发送文件，已改为下载"
          : "当前是非安全连接，无法调用系统分享，已改为下载；手机分享请使用 HTTPS");
        return;
      }

      const file = new File([blob], resolvedName, {
        type: cleanMimeType(blob.type || response.headers.get("Content-Type")),
        lastModified: Date.now()
      });
      if (!navigator.canShare({ files: [file] })) {
        fallbackToDownload(blob, resolvedName);
        setState("idle");
        setMessage("当前浏览器无法发送此文件，已改为下载");
        return;
      }

      preparedFile.current = file;
      setState("ready");
      const activation = navigator.userActivation;
      if (!activation || activation.isActive) {
        await sharePreparedFile(file);
      } else {
        setMessage("文件已准备好，请再次点击发送");
      }
    } catch (error) {
      if (error instanceof TypeError) {
        const downloaded = fallbackToDownload();
        setState(downloaded ? "idle" : "error");
        setMessage(downloaded
          ? "浏览器无法读取此文件用于发送，已改为原方式下载"
          : "浏览器无法读取此文件，请使用页面上的原下载按钮");
        return;
      }
      setState("error");
      setMessage(error instanceof Error ? error.message : "文件准备失败，请稍后重试");
    }
  }, [fallbackToDownload, fileName, maxBytes, request?.body, request?.headers, request?.method, sharePreparedFile, state, url]);

  return {
    share,
    state,
    message,
    busy: state === "preparing" || state === "sharing",
    ready: state === "ready"
  };
}

async function responseError(response: Response) {
  try {
    const result = await response.clone().json() as { message?: string };
    if (result.message) return result.message;
  } catch {}
  return response.status === 401 || response.status === 403
    ? "没有权限获取该文件"
    : `文件获取失败（${response.status}）`;
}

function responseFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("Content-Disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return safeFileName(decodeURIComponent(encoded));
    } catch {}
  }
  const quoted = disposition.match(/filename="([^"]+)"/i)?.[1];
  return safeFileName(quoted || fallback);
}

function safeFileName(value: string) {
  const name = value.trim().replace(/[\\/\u0000-\u001f]/g, "_");
  return name && name !== "." && name !== ".." ? name : "download";
}

function cleanMimeType(value: string | null) {
  return value?.split(";", 1)[0]?.trim() || "application/octet-stream";
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function isDomException(error: unknown, name: string) {
  return error instanceof DOMException && error.name === name;
}

function formatSize(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}
