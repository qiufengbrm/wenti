import type { Role } from "@/types/role";

export interface SessionPayload {
  id: string;
  username: string;
  role: Role;
}

const lifetime = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return value;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey() {
  return crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function encodeSession(payload: SessionPayload) {
  const content = toBase64Url(encoder.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + lifetime })));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(content)));
  return `${content}.${toBase64Url(signature)}`;
}

export async function decodeSession(value?: string): Promise<SessionPayload | null> {
  if (!value) return null;
  try {
    const parts = value.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const valid = await crypto.subtle.verify("HMAC", await signingKey(), fromBase64Url(parts[1]), encoder.encode(parts[0]));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0]))) as SessionPayload & { exp?: number };
    if (!payload.id || !payload.username || !["admin", "super_admin", "volunteer"].includes(payload.role)) return null;
    if (!payload.exp || payload.exp <= Date.now() / 1000) return null;
    return { id: payload.id, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}

export const sessionMaxAge = lifetime;
