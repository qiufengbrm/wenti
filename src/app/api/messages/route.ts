/** 项目导读：接口路由 /api/messages：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { getUnreadMessageCount, type MessageCenterCategory } from "@/lib/data";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  if (request.nextUrl.searchParams.get("mode") === "unread-count") {
    const count = await getUnreadMessageCount(auth.user.id);
    return NextResponse.json({ count });
  }

  const data = await prisma.message.findMany({
    where: { receiverId: auth.user.id },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  const payload = (await request.json().catch(() => ({}))) as {
    all?: boolean;
    category?: MessageCenterCategory;
    peerId?: string;
  };

  if (payload.all === true) {
    const result = await prisma.message.updateMany({
      where: { receiverId: auth.user.id, status: "UNREAD" },
      data: { status: "READ", readAt: new Date() }
    });
    return NextResponse.json({ message: "所有消息已标记为已读。", data: { messageCount: result.count } });
  }

  if (!payload.category || !payload.peerId) {
    return NextResponse.json({ message: "缺少消息分类或会话对象。" }, { status: 400 });
  }

  const categories = payload.category === "system" ? ["SYSTEM" as const] : (["APPLICATION", "REPLY"] as const);

  await prisma.message.updateMany({
    where: {
      receiverId: auth.user.id,
      status: "UNREAD",
      category: {
        in: [...categories]
      },
      senderId: payload.peerId === "system" ? null : payload.peerId
    },
    data: {
      status: "READ",
      readAt: new Date()
    }
  });

  return NextResponse.json({ message: "消息已标记为已读。" });
}
