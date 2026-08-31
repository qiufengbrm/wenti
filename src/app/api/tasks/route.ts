/** 项目导读：接口路由 /api/tasks：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiAdmin, requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const tasks = await prisma.task.findMany({
    include: {
      createdBy: true,
      taskType: true,
      _count: { select: { signups: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ data: tasks });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.response || !auth.user) return auth.response;

  const payload = (await request.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    typeId?: string;
    startDate?: string;
    endDate?: string;
    startClockTime?: string;
    endClockTime?: string;
    maxMembers?: number;
    estimatedHours?: number;
    needProof?: boolean;
    allowCancel?: boolean;
    cancelNeedsReview?: boolean;
    status?: "DRAFT" | "PUBLISHED";
  };

  if (!payload.title?.trim() || !payload.description?.trim() || !payload.typeId) {
    return NextResponse.json({ message: "请填写任务标题、类型和内容。" }, { status: 400 });
  }

  if (!payload.maxMembers || payload.maxMembers <= 0) {
    return NextResponse.json({ message: "所需人数必须大于 0。" }, { status: 400 });
  }

  if (!payload.estimatedHours || payload.estimatedHours <= 0 || payload.estimatedHours * 2 !== Math.floor(payload.estimatedHours * 2)) {
    return NextResponse.json({ message: "预计时长必须大于 0，且为 0.5 小时的倍数。" }, { status: 400 });
  }

  const startTime = parseDateAndTime(payload.startDate, payload.startClockTime, "00:00");
  const endTime = parseDateAndTime(payload.endDate, payload.endClockTime, "23:59");
  if ((payload.startDate && !startTime) || (payload.endDate && !endTime)) return NextResponse.json({ message: "任务日期或时间格式无效。" }, { status: 400 });
  if (payload.startClockTime && !normalizeClock(payload.startClockTime)) return NextResponse.json({ message: "开始时间格式无效。" }, { status: 400 });
  if (payload.endClockTime && !normalizeClock(payload.endClockTime)) return NextResponse.json({ message: "结束时间格式无效。" }, { status: 400 });
  if (payload.startClockTime && !payload.startDate) return NextResponse.json({ message: "填写开始时间前请先选择开始日期。" }, { status: 400 });
  if (payload.endClockTime && !payload.endDate) return NextResponse.json({ message: "填写结束时间前请先选择结束日期。" }, { status: 400 });
  if (startTime && endTime && endTime < startTime) return NextResponse.json({ message: "结束日期和时间不能早于开始日期和时间。" }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      title: payload.title.trim(),
      description: payload.description.trim(),
      typeId: payload.typeId,
      startTime,
      endTime,
      startClockTime: normalizeClock(payload.startClockTime),
      endClockTime: normalizeClock(payload.endClockTime),
      deadline: startTime,
      maxMembers: payload.maxMembers,
      estimatedHours: payload.estimatedHours,
      needProof: payload.needProof ?? true,
      allowCancel: payload.allowCancel ?? true,
      cancelNeedsReview: payload.cancelNeedsReview ?? true,
      status: payload.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
      createdById: auth.user.id
    }
  });

  return NextResponse.json({ data: task, message: "任务已写入数据库。" });
}

function parseDateAndTime(dateValue?: string, clockValue?: string, fallbackClock = "00:00") {
  if (!dateValue) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const clock = normalizeClock(clockValue) ?? fallbackClock;
  const date = new Date(`${dateValue}T${clock}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeClock(value?: string) {
  const clock = value?.trim();
  return clock && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock) ? clock : null;
}
