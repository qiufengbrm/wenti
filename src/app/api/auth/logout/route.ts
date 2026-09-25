import { NextResponse, type NextRequest } from "next/server";
import { authCookieName } from "@/lib/auth-constants";
import { requireSameOrigin } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0, sameSite: "lax" });
  return response;
}
