/** 项目导读：接口路由 /api/tasks/[id]/signup：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { isVolunteer } from "@/lib/permissions";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  if (!isVolunteer(auth.user.role)) {
    return NextResponse.json({ message: "只有普通志愿者可以接取任务" }, { status: 403 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      signups: {
        where: {
          status: {
            not: "CANCELLED"
          }
        }
      }
    }
  });

  if (!task || task.status !== "PUBLISHED") {
    return NextResponse.json({ message: "当前任务不可接取。" }, { status: 400 });
  }

  if (task.maxMembers && task.signups.length >= task.maxMembers) {
    return NextResponse.json({ message: "任务人数已满。" }, { status: 400 });
  }

  const existing = await prisma.taskSignup.findUnique({
    where: {
      taskId_userId: {
        taskId: id,
        userId: auth.user.id
      }
    }
  });

  if (existing && existing.status !== "CANCELLED") {
    return NextResponse.json({ message: "你已经接取过该任务，不能重复接取。" }, { status: 400 });
  }

  const signup = existing
    ? await prisma.taskSignup.update({
        where: { id: existing.id },
        data: {
          status: "SIGNED_UP",
          signupAt: new Date(),
          cancelReason: null,
          cancelRequestedAt: null,
          cancelReviewedAt: null,
          cancelReviewedById: null
        }
      })
    : await prisma.taskSignup.create({
        data: {
          taskId: id,
          userId: auth.user.id,
          status: "SIGNED_UP"
        }
      });

  return NextResponse.json({ data: signup, message: "已接取任务。" });
}
