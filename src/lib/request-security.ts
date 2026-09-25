import { NextResponse, type NextRequest } from "next/server";

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0] || request.nextUrl.protocol.slice(0, -1);
  const expected = host ? `${protocol}://${host}` : request.nextUrl.origin;
  if (origin !== expected) return NextResponse.json({ message: "请求来源无效" }, { status: 403 });
  return null;
}
