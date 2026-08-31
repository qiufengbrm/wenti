/** 项目导读：服务端数据总入口：集中查询并整理页面需要的数据；这里负责端菜，不让组件自己下田插秧。 */
import { prisma } from "@/lib/db";
import { getPreviewKind } from "@/lib/resource-storage";
import { sanitizeTutorialHtml } from "@/lib/tutorial-content";

const taskStatusLabels: Record<string, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  FULL: "人数已满",
  IN_PROGRESS: "进行中",
  ENDED: "已结束",
  ARCHIVED: "已归档"
};

const signupStatusLabels: Record<string, string> = {
  SIGNED_UP: "已接取",
  CANCEL_REQUESTED: "已接取",
  CANCELLED: "已取消",
  SUBMITTED: "待审核",
  APPROVED: "已通过",
  REJECTED: "已驳回"
};

const cancelStatusLabels: Record<string, string> = {
  CANCEL_REQUESTED: "待审核",
  CANCELLED: "已同意",
  SIGNED_UP: "-",
  SUBMITTED: "-",
  APPROVED: "-",
  REJECTED: "-"
};

const visibilityLabels: Record<string, string> = {
  ALL: "全体可见",
  ADMINS: "管理员可见",
  VOLUNTEERS: "志愿者可见",
  PRIVATE: "私密"
};

const messageStatusLabels: Record<string, string> = {
  UNREAD: "未读",
  READ: "已读"
};

const hourStatusLabels: Record<string, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已驳回"
};

export async function getTaskTypes() {
  const taskTypes = await prisma.taskType.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }]
  });

  return taskTypes.map((type) => ({
    id: type.id,
    name: type.name,
    description: type.description ?? "",
    defaultTemplate: type.defaultTemplate ?? "",
    defaultHours: type.defaultHours ?? "",
    isActive: type.isActive
  }));
}

export async function getTasks() {
  const tasks = await prisma.task.findMany({
    include: {
      createdBy: true,
      signups: true,
      taskType: true
    },
    orderBy: { createdAt: "desc" }
  });

  return tasks.map((task) => formatTask(task));
}

export async function getTaskDetail(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      createdBy: true,
      signups: {
        include: {
          user: true,
          submissions: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { signupAt: "desc" }
      },
      taskType: true
    }
  });

  if (!task) {
    return null;
  }

  return {
    task: formatTask(task),
    signups: task.signups.map((signup) => {
      const submission = signup.submissions[0];
      return {
        id: signup.id,
        taskId: signup.taskId,
        userId: signup.userId,
        user: signup.user.name,
        studentId: signup.user.studentId ?? "-",
        status: signupStatusLabels[signup.status],
        signupAt: formatDateTime(signup.signupAt),
        submittedAt: submission ? formatDateTime(submission.createdAt) : "-",
        actualHours: submission?.actualHours ? String(submission.actualHours) : "-",
        proofFileName: submission?.proofFileName ?? "-",
        proofDescription: submission?.description ?? "-",
        cancelReason: signup.cancelReason ?? "-",
        cancelRequestedAt: signup.cancelRequestedAt ? formatDateTime(signup.cancelRequestedAt) : "-",
        cancelStatus: cancelStatusLabels[signup.status] ?? "-"
      };
    })
  };
}

export async function getAdminTaskReviewQueue(adminId: string) {
  const signups = await prisma.taskSignup.findMany({
    where: {
      task: {
        createdById: adminId
      },
      OR: [{ status: "CANCEL_REQUESTED" }, { status: "SUBMITTED" }]
    },
    include: {
      user: true,
      task: {
        include: {
          taskType: true
        }
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: [{ cancelRequestedAt: "desc" }, { signupAt: "desc" }]
  });

  return signups.map((signup) => {
    const submission = signup.submissions[0];

    return {
      id: signup.id,
      taskId: signup.taskId,
      taskTitle: signup.task.title,
      taskType: signup.task.taskType.name,
      user: signup.user.name,
      studentId: signup.user.studentId ?? "-",
      status: signupStatusLabels[signup.status],
      signupAt: formatDateTime(signup.signupAt),
      submittedAt: submission ? formatDateTime(submission.createdAt) : "-",
      actualHours: submission?.actualHours ? String(submission.actualHours) : "-",
      proofFileName: submission?.proofFileName ?? "-",
      proofDescription: submission?.description ?? "-",
      cancelReason: signup.cancelReason ?? "-",
      cancelRequestedAt: signup.cancelRequestedAt ? formatDateTime(signup.cancelRequestedAt) : "-",
      cancelStatus: cancelStatusLabels[signup.status] ?? "-"
    };
  });
}

export async function getVolunteerTaskSignup(taskId: string, userId: string) {
  const signup = await prisma.taskSignup.findUnique({
    where: {
      taskId_userId: {
        taskId,
        userId
      }
    },
    include: {
      user: true,
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!signup) {
    return undefined;
  }

  const submission = signup.submissions[0];

  return {
    id: signup.id,
    taskId: signup.taskId,
    userId: signup.userId,
    user: signup.user.name,
    studentId: signup.user.studentId ?? "-",
    status: signupStatusLabels[signup.status],
    signupAt: formatDateTime(signup.signupAt),
    submittedAt: submission ? formatDateTime(submission.createdAt) : "-",
    actualHours: submission?.actualHours ? String(submission.actualHours) : "-",
    proofFileName: submission?.proofFileName ?? "-",
    proofDescription: submission?.description ?? "-",
    cancelReason: signup.cancelReason ?? "-",
    cancelRequestedAt: signup.cancelRequestedAt ? formatDateTime(signup.cancelRequestedAt) : "-",
    cancelStatus: cancelStatusLabels[signup.status] ?? "-"
  };
}

export async function getVolunteerTaskSummary(userId: string) {
  const [tasks, signups] = await Promise.all([
    getTasks(),
    prisma.taskSignup.findMany({
      where: { userId },
      include: {
        task: {
          include: {
            createdBy: true,
            signups: true,
            taskType: true
          }
        },
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        user: true
      },
      orderBy: { signupAt: "desc" }
    })
  ]);

  const myTaskIds = new Set(signups.map((signup) => signup.taskId));
  const allPublishedTasks = tasks.filter((task) => !["草稿", "已归档"].includes(task.status));
  const currentTasks = signups
    .filter((signup) => ["SIGNED_UP", "CANCEL_REQUESTED"].includes(signup.status))
    .map((signup) => formatTask(signup.task));

  return {
    recentTasks: allPublishedTasks.slice(0, 3),
    currentTasks,
    allPublishedTasks,
    availableTasks: allPublishedTasks,
    myTasks: signups.map((signup) => formatTask(signup.task)),
    reviewTasks: signups
      .filter((signup) => ["CANCEL_REQUESTED", "SUBMITTED"].includes(signup.status))
      .map((signup) => {
        const submission = signup.submissions[0];
        const isCancelReview = signup.status === "CANCEL_REQUESTED";
        return {
          id: signup.taskId,
          user: signup.user.name,
          title: signup.task.title,
          type: signup.task.taskType.name,
          reviewType: isCancelReview ? "取消任务审核" : "志愿时长审核",
          status: signupStatusLabels[signup.status],
          submittedAt: isCancelReview
            ? signup.cancelRequestedAt
              ? formatDateTime(signup.cancelRequestedAt)
              : "-"
            : submission
              ? formatDateTime(submission.createdAt)
              : "-",
          actualHours: submission?.actualHours ? String(submission.actualHours) : "-",
          proofFileName: submission?.proofFileName ?? "-",
          proofDescription: isCancelReview ? (signup.cancelReason ?? "-") : (submission?.description ?? "-")
        };
      }),
    signedTaskIds: myTaskIds
  };
}

export async function getMessages(userId: string) {
  const messages = await prisma.message.findMany({
    where: { receiverId: userId },
    orderBy: { createdAt: "desc" }
  });

  return messages.map((message) => ({
    id: message.id,
    title: message.title,
    content: message.content,
    status: messageStatusLabels[message.status],
    date: formatDateTime(message.createdAt),
    relatedUrl: message.relatedUrl ?? "#"
  }));
}

export async function getUnreadMessageCount(userId: string) {
  return prisma.message.count({
    where: { receiverId: userId, status: "UNREAD" }
  });
}

export async function getMessageCenterData(userId: string) {
  const messages = await prisma.message.findMany({
    where: { OR: [{ receiverId: userId }, { senderId: userId }] },
    include: { sender: true, receiver: true },
    orderBy: { createdAt: "desc" }
  });

  const threads = new Map<string, MessageCenterThread>();

  for (const message of messages) {
    const peer =
      message.senderId === userId
        ? message.receiver
        : message.sender ?? {
            id: "system",
            name: "系统消息",
            username: "system"
          };
    const category = message.category === "SYSTEM" ? "system" : "tasks";
    const threadId = `${category}:${peer.id}`;
    const direction = message.senderId === userId ? ("sent" as const) : ("received" as const);
    const display = getMessageDisplayText({
      title: message.title,
      content: message.content,
      category: message.category,
      direction
    });
    const item = {
      id: message.id,
      source: "message" as const,
      title: display.title,
      content: display.content,
      date: formatDateTime(message.createdAt),
      timestamp: message.createdAt.getTime(),
      status: messageStatusLabels[message.status],
      direction,
      relatedUrl: message.relatedUrl ?? "#"
    };

    const existing = threads.get(threadId);
    if (existing) {
      existing.items.push(item);
      existing.updatedAt = Math.max(existing.updatedAt, item.timestamp);
      if (message.receiverId === userId && message.status === "UNREAD") existing.unreadCount += 1;
      if (item.timestamp >= existing.lastTimestamp) {
        existing.preview = item.content;
        existing.lastTimestamp = item.timestamp;
      }
    } else {
      threads.set(threadId, {
        id: threadId,
        category,
        peerId: peer.id,
        peerName: peer.name,
        peerSubline: `@${peer.username}`,
        preview: item.content,
        unreadCount: message.receiverId === userId && message.status === "UNREAD" ? 1 : 0,
        updatedAt: item.timestamp,
        lastTimestamp: item.timestamp,
        items: [item]
      });
    }
  }

  return Array.from(threads.values())
    .map((thread) => ({
      ...thread,
      items: thread.items.sort((a, b) => a.timestamp - b.timestamp)
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export type MessageCenterCategory = "tasks" | "system";

export interface MessageCenterItem {
  id: string;
  source: "message";
  title: string;
  content: string;
  date: string;
  timestamp: number;
  status: string;
  direction: "sent" | "received";
  relatedUrl: string;
}

export interface MessageCenterThread {
  id: string;
  category: MessageCenterCategory;
  peerId: string;
  peerName: string;
  peerSubline: string;
  preview: string;
  unreadCount: number;
  updatedAt: number;
  lastTimestamp: number;
  items: MessageCenterItem[];
}

function getMessageDisplayText({
  title,
  content,
  category,
  direction
}: {
  title: string;
  content: string;
  category: string;
  direction: "sent" | "received";
}) {
  if (category === "APPLICATION") {
    const project = extractQuotedProject(content) ?? extractField(content, "项目") ?? "未填写";
    const person = extractLeadingName(content) ?? extractField(content, "申请人") ?? extractField(content, "提交人");
    const reason = extractField(content, "原因");
    const hours = extractHours(content) ?? extractField(content, "申报时长") ?? extractField(content, "实际时长");
    const description = extractField(content, "说明");

    if (title.includes("取消任务申请") || title.includes("取消申请")) {
      if (direction === "sent") {
        return {
          title: "取消申请",
          content: compactLines(["项目：" + project, reason ? "原因：" + reason : null])
        };
      }

      return {
        title: "取消申请",
        content: compactLines([person ? "申请人：" + person : null, "项目：" + project, reason ? "原因：" + reason : null])
      };
    }

    if (title.includes("志愿时长申报") || title.includes("完成证明") || title.includes("实际时长")) {
      if (direction === "sent") {
        return {
          title: "志愿时长申报",
          content: compactLines(["项目：" + project, hours ? "申报时长：" + hours : null, description ? "说明：" + description : null])
        };
      }

      return {
        title: "志愿时长申报",
        content: compactLines([person ? "提交人：" + person : null, "项目：" + project, hours ? "申报时长：" + hours : null, description ? "说明：" + description : null])
      };
    }

    return {
      title: direction === "sent" ? "申请提交" : "待处理申请",
      content
    };
  }

  if (category === "REPLY") {
    const project = extractQuotedProject(content) ?? extractField(content, "项目");
    const hours = extractHours(content) ?? extractField(content, "申报时长") ?? extractField(content, "实际时长");
    const reason = extractField(content, "原因");
    const note = extractField(content, "说明");

    if (title.includes("志愿时长申报已同意") || title.includes("志愿时长审核通过") || title.includes("审核通过")) {
      return {
        title: "志愿时长申报已同意",
        content: compactLines([project ? "项目：" + project : null, hours ? "申报时长：" + hours : null])
      };
    }

    if (title.includes("志愿时长申报未同意") || title.includes("完成证明被驳回")) {
      return {
        title: "志愿时长申报未同意",
        content: compactLines([project ? "项目：" + project : null, reason ? "原因：" + reason : null])
      };
    }

    if (title.includes("取消申请已同意") || title.includes("取消申请未同意") || title.includes("取消申请已驳回")) {
      return {
        title: title.includes("驳回") ? "取消申请未同意" : title,
        content: compactLines([project ? "项目：" + project : null, note ? "说明：" + note : null])
      };
    }
  }

  return { title, content };
}

function compactLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

function extractQuotedProject(content: string) {
  return content.match(/「(.+?)」/)?.[1] ?? content.match(/项目：(.+?)(?:\n|$)/)?.[1]?.trim();
}

function extractField(content: string, label: string) {
  const line = content.split("\n").find((item) => item.startsWith(`${label}：`));
  return line?.replace(`${label}：`, "").trim();
}

function extractLeadingName(content: string) {
  return content.match(/^(.+?)\s(?:申请|已提交)/)?.[1];
}

function extractHours(content: string) {
  return content.match(/实际时长\s?([\d.]+)\s?小时/)?.[1]?.concat(" 小时");
}

export async function getVolunteerHours(userId: string) {
  const hours = await prisma.volunteerHour.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return hours.map((hour) => ({
    activityName: hour.activityName,
    hours: hour.hours,
    status: hourStatusLabels[hour.status],
    date: formatDate(hour.createdAt)
  }));
}

export async function getAdminHours() {
  const hours = await prisma.volunteerHour.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" }
  });

  return hours.map((hour) => ({
    user: hour.user.name,
    activityName: hour.activityName,
    hours: hour.hours,
    status: hourStatusLabels[hour.status],
    date: formatDate(hour.createdAt)
  }));
}

export async function getAdminHourOverview() {
  const users = await prisma.user.findMany({
    where: { role: "VOLUNTEER" },
    include: {
      taskSubmissions: {
        select: { status: true }
      },
      volunteerHours: {
        include: { task: true },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { name: "asc" }
  });

  const currentMonth = hourMonthKey(new Date());
  const volunteers = users.map((user) => {
    const approved = user.volunteerHours.filter((hour) => hour.status === "APPROVED");
    const totalHours = sumHours(approved.map((hour) => hour.hours));
    const currentMonthHours = sumHours(
      approved
        .filter((hour) => hourMonthKey(hour.serviceStartAt ?? hour.task?.startTime ?? hour.createdAt) === currentMonth)
        .map((hour) => hour.hours)
    );

    return {
      id: user.id,
      name: user.name,
      studentId: user.studentId ?? "-",
      major: user.major ?? "-",
      className: user.className ?? "-",
      totalHours,
      currentMonthHours,
      approvedCount: approved.length,
      pendingCount: user.volunteerHours.filter((hour) => hour.taskId === null && hour.status === "PENDING").length
        + user.taskSubmissions.filter((submission) => submission.status === "PENDING").length,
      lastServiceAt: approved.length
        ? formatDate(new Date(Math.max(...approved.map((hour) => (hour.serviceStartAt ?? hour.task?.startTime ?? hour.createdAt).getTime()))))
        : "暂无记录"
    };
  }).sort((first, second) => second.totalHours - first.totalHours || first.name.localeCompare(second.name, "zh-CN"));

  const allHours = users.flatMap((user) => user.volunteerHours);
  const pendingTaskSubmissions = users.reduce(
    (total, user) => total + user.taskSubmissions.filter((submission) => submission.status === "PENDING").length,
    0
  );
  const approvedHours = allHours.filter((hour) => hour.status === "APPROVED");
  const availableMonths = Array.from(new Set([
    currentMonth,
    ...approvedHours.map((hour) => hourMonthKey(hour.serviceStartAt ?? hour.task?.startTime ?? hour.createdAt))
  ])).sort().reverse();

  return {
    volunteers,
    availableMonths,
    summary: {
      totalHours: sumHours(approvedHours.map((hour) => hour.hours)),
      currentMonthHours: sumHours(
        approvedHours
          .filter((hour) => hourMonthKey(hour.serviceStartAt ?? hour.task?.startTime ?? hour.createdAt) === currentMonth)
          .map((hour) => hour.hours)
      ),
      volunteersWithHours: volunteers.filter((volunteer) => volunteer.totalHours > 0).length,
      pendingCount: allHours.filter((hour) => hour.taskId === null && hour.status === "PENDING").length + pendingTaskSubmissions
    }
  };
}

export async function getAdminVolunteerHourDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      volunteerHours: {
        include: { task: true, reviewedBy: true },
        orderBy: { createdAt: "desc" }
      },
      taskSubmissions: {
        include: { task: true, reviewedBy: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!user || user.role !== "VOLUNTEER") return null;

  const approved = user.volunteerHours.filter((hour) => hour.status === "APPROVED");
  const directHours = user.volunteerHours.filter((hour) => hour.taskId === null);
  const taskIdsWithSubmissions = new Set(user.taskSubmissions.map((submission) => submission.taskId));
  const legacyTaskHours = user.volunteerHours.filter((hour) => hour.taskId && !taskIdsWithSubmissions.has(hour.taskId));
  const availableMonths = Array.from(new Set(
    approved.map((hour) => hourMonthKey(hour.serviceStartAt ?? hour.task?.startTime ?? hour.createdAt))
  )).sort().reverse();

  return {
    volunteer: {
      id: user.id,
      name: user.name,
      studentId: user.studentId ?? "-",
      grade: user.grade ?? "-",
      major: user.major ?? "-",
      className: user.className ?? "-"
    },
    summary: {
      totalHours: sumHours(approved.map((hour) => hour.hours)),
      approvedCount: approved.length,
      pendingCount: directHours.filter((hour) => hour.status === "PENDING").length + user.taskSubmissions.filter((submission) => submission.status === "PENDING").length,
      rejectedCount: directHours.filter((hour) => hour.status === "REJECTED").length + user.taskSubmissions.filter((submission) => submission.status === "REJECTED").length
    },
    availableMonths,
    records: [
      ...directHours.map((hour) => ({
        id: hour.id,
        recordType: "direct" as const,
        activityName: hour.activityName,
        source: "自主申报",
        taskId: null,
        workContent: hour.workContent || "未填写",
        serviceTime: formatHourServiceRange(hour.serviceStartAt, hour.serviceEndAt, hour.serviceStartClockTime, hour.serviceEndClockTime),
        hours: hour.hours,
        status: hourStatusLabels[hour.status],
        statusCode: hour.status,
        submittedAt: formatDateTime(hour.createdAt),
        reviewedBy: hour.reviewedBy?.name ?? "-",
        proofFileName: hour.proofFileName,
        proofHref: hour.proofFileName ? `/api/hour-proofs/direct/${hour.id}/download` : null,
        notes: hour.notes || "无",
        rejectReason: hour.rejectReason || "",
        sortTime: hour.createdAt.getTime()
      })),
      ...user.taskSubmissions.map((submission) => ({
        id: submission.id,
        recordType: "taskSubmission" as const,
        activityName: submission.task.title,
        source: "任务活动",
        taskId: submission.taskId,
        workContent: submission.description || "未填写",
        serviceTime: formatHourServiceRange(submission.task.startTime, submission.task.endTime, submission.task.startClockTime, submission.task.endClockTime),
        hours: submission.actualHours,
        status: hourStatusLabels[submission.status],
        statusCode: submission.status,
        submittedAt: formatDateTime(submission.createdAt),
        reviewedBy: submission.reviewedBy?.name ?? "-",
        proofFileName: submission.proofFileName,
        proofHref: submission.proofFileName ? `/api/hour-proofs/task/${submission.id}/download` : null,
        notes: "无",
        rejectReason: submission.rejectReason || "",
        sortTime: submission.createdAt.getTime()
      })),
      ...legacyTaskHours.map((hour) => ({
        id: hour.id,
        recordType: "taskHour" as const,
        activityName: hour.activityName,
        source: "任务活动",
        taskId: hour.taskId,
        workContent: hour.workContent || "未填写",
        serviceTime: formatHourServiceRange(hour.task?.startTime, hour.task?.endTime, hour.task?.startClockTime, hour.task?.endClockTime),
        hours: hour.hours,
        status: hourStatusLabels[hour.status],
        statusCode: hour.status,
        submittedAt: formatDateTime(hour.createdAt),
        reviewedBy: hour.reviewedBy?.name ?? "-",
        proofFileName: hour.proofFileName,
        proofHref: hour.proofFileName ? `/api/hour-proofs/direct/${hour.id}/download` : null,
        notes: hour.notes || "无",
        rejectReason: hour.rejectReason || "",
        sortTime: hour.createdAt.getTime()
      }))
    ].sort((first, second) => second.sortTime - first.sortTime).map(({ sortTime: _sortTime, ...record }) => record)
  };
}

function sumHours(hours: number[]) {
  return Math.round(hours.reduce((total, value) => total + value, 0) * 100) / 100;
}

function hourMonthKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(value);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

function formatHourServiceRange(start: Date | null | undefined, end: Date | null | undefined, startClock: string | null | undefined, endClock: string | null | undefined) {
  if (!start && !end) return "服务时间未记录";
  const startText = start ? `${formatDate(start)}${startClock ? ` ${startClock}` : ""}` : "-";
  const endText = end ? `${formatDate(end)}${endClock ? ` ${endClock}` : ""}` : "-";
  return `${startText} — ${endText}`;
}

export async function getVolunteers() {
  const users = await prisma.user.findMany({
    where: { role: "VOLUNTEER", deletedAt: null },
    include: { volunteerProfile: true },
    orderBy: { createdAt: "desc" }
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    name: user.name,
    role: "volunteer",
    status: user.status === "ACTIVE" ? "active" : user.status === "DISABLED" ? "disabled" : "pending",
    studentId: user.studentId ?? "-",
    grade: user.grade ?? "-",
    major: user.major ?? "-",
    className: user.className ?? "-",
    phone: user.phone ?? "-",
    skills: user.volunteerProfile?.skills ?? "",
    profileComplete: Boolean(user.phone && user.volunteerProfile?.skills)
  }));
}

export async function getVolunteerDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      signups: {
        include: {
          task: {
            include: {
              createdBy: true,
              signups: true,
              taskType: true
            }
          }
        }
      },
      volunteerHours: true,
      volunteerProfile: true
    }
  });

  if (!user || user.role !== "VOLUNTEER") {
    return null;
  }

  return {
    volunteer: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: "volunteer",
      status: user.status === "ACTIVE" ? "active" : user.status === "DISABLED" ? "disabled" : "pending",
      studentId: user.studentId ?? "-",
      grade: user.grade ?? "-",
      major: user.major ?? "-",
      className: user.className ?? "-",
      phone: user.phone ?? "-",
      qq: user.qq ?? "-",
      wechat: user.wechat ?? "-",
      skills: user.volunteerProfile?.skills ?? "-",
      groupName: user.volunteerProfile?.groupName ?? "-",
      notes: user.volunteerProfile?.notes ?? "-"
    },
    tasks: user.signups.map((signup) => formatTask(signup.task)),
    hours: user.volunteerHours.map((hour) => ({
      activityName: hour.activityName,
      hours: hour.hours,
      status: hourStatusLabels[hour.status],
      date: formatDate(hour.createdAt)
    }))
  };
}

export async function getAccounts() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }]
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role === "SUPER_ADMIN" ? "super_admin" : user.role === "ADMIN" ? "admin" : "volunteer",
    status: user.status === "ACTIVE" ? "active" : user.status === "DISABLED" ? "disabled" : "pending",
    mustChangePassword: user.mustChangePassword
  }));
}

export async function getFiles(forVolunteer = false) {
  const files = await prisma.fileResource.findMany({
    where: forVolunteer ? { visibility: { in: ["ALL", "VOLUNTEERS"] } } : undefined,
    include: { uploadedBy: true },
    orderBy: { createdAt: "desc" }
  });

  return files.map((file) => ({
    id: file.id,
    title: file.title,
    category: file.category,
    uploader: file.uploadedBy.name,
    visibility: visibilityLabels[file.visibility],
    date: formatDate(file.createdAt),
    createdAt: file.createdAt.toISOString(),
    fileUrl: file.fileUrl,
    fileName: file.fileName ?? file.title,
    fileType: file.fileType ?? "",
    fileSize: file.fileSize,
    description: file.description ?? "",
    tags: file.tags
      ? file.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []
  }));
}

export async function getTutorials(forVolunteer = false) {
  const tutorials = await prisma.tutorial.findMany({
    where: forVolunteer ? { status: "PUBLISHED", visibility: { in: ["ALL", "VOLUNTEERS"] } } : undefined,
    include: { author: true },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }]
  });

  return tutorials.map((tutorial) => ({
    id: tutorial.id,
    title: tutorial.title,
    category: tutorial.category,
    author: tutorial.author.name,
    visibility: visibilityLabels[tutorial.visibility],
    visibilityCode: tutorial.visibility,
    status: tutorial.status === "PUBLISHED" ? "已发布" : "草稿",
    statusCode: tutorial.status,
    isPinned: tutorial.isPinned,
    hasAttachment: Boolean(tutorial.attachmentStorageKey),
    attachmentFileName: tutorial.attachmentFileName,
    date: formatDate(tutorial.publishedAt ?? tutorial.updatedAt)
  }));
}

export async function getTutorialDetail(id: string, forVolunteer = false) {
  const tutorial = await prisma.tutorial.findFirst({
    where: {
      id,
      ...(forVolunteer ? { status: "PUBLISHED" as const, visibility: { in: ["ALL", "VOLUNTEERS"] as const } } : {})
    },
    include: { author: true }
  });
  if (!tutorial) return null;

  return {
    id: tutorial.id,
    title: tutorial.title,
    content: tutorial.contentFormat === "RICH_TEXT" ? sanitizeTutorialHtml(tutorial.content) : tutorial.content,
    contentFormat: tutorial.contentFormat,
    category: tutorial.category,
    author: tutorial.author.name,
    visibility: tutorial.visibility,
    visibilityLabel: visibilityLabels[tutorial.visibility],
    status: tutorial.status,
    statusLabel: tutorial.status === "PUBLISHED" ? "已发布" : "草稿",
    tags: tutorial.tags ?? "",
    isPinned: tutorial.isPinned,
    attachmentFileName: tutorial.attachmentFileName,
    attachmentFileType: tutorial.attachmentFileType,
    attachmentFileSize: tutorial.attachmentFileSize,
    publishedAt: tutorial.publishedAt ? formatDateTime(tutorial.publishedAt) : null,
    updatedAt: formatDateTime(tutorial.updatedAt)
  };
}

export async function getOperationLogs() {
  const logs = await prisma.operationLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" }
  });

  return logs.map((log) => ({
    id: log.id,
    user: log.user?.name ?? "系统",
    action: log.action,
    targetType: log.targetType,
    detail: log.detail ?? "-",
    date: formatDateTime(log.createdAt)
  }));
}

export async function getPendingHourReviewItems() {
  const [applications, taskSubmissions] = await Promise.all([
    prisma.volunteerHour.findMany({
      where: { taskId: null, status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.taskSubmission.findMany({
      where: { status: "PENDING", signup: { status: "SUBMITTED" } },
      include: { user: true, task: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  return [
    ...applications.map((item) => ({
      id: item.id,
      source: "direct" as const,
      sourceLabel: "自主申报",
      detailHref: `/admin/tasks/hours/review/${item.id}`,
      user: item.user.name,
      studentId: item.user.studentId ?? "-",
      workContent: item.workContent ?? item.activityName,
      serviceTime: formatHourServiceRange(item.serviceStartAt, item.serviceEndAt, item.serviceStartClockTime, item.serviceEndClockTime),
      hours: item.hours,
      proofFileName: item.proofFileName,
      proofPreviewKind: item.proofFileName ? getPreviewKind(item.proofFileName, item.proofFileType) : "none" as const,
      proofCanPreview: Boolean(item.proofFileUrl && item.proofFileName && getPreviewKind(item.proofFileName, item.proofFileType) !== "none"),
      notes: item.notes,
      submittedAt: formatDateTime(item.createdAt),
      sortTime: item.createdAt.getTime()
    })),
    ...taskSubmissions.map((item) => ({
      id: item.id,
      source: "task" as const,
      sourceLabel: `任务：${item.task.title}`,
      detailHref: `/admin/tasks/${item.taskId}`,
      taskId: item.taskId,
      signupId: item.signupId,
      user: item.user.name,
      studentId: item.user.studentId ?? "-",
      workContent: item.description,
      serviceTime: formatHourServiceRange(item.task.startTime, item.task.endTime, item.task.startClockTime, item.task.endClockTime),
      hours: item.actualHours,
      proofFileName: item.proofFileName,
      proofPreviewKind: item.proofFileName ? getPreviewKind(item.proofFileName, item.proofFileType) : "none" as const,
      proofCanPreview: Boolean(item.proofFileUrl && item.proofFileName && getPreviewKind(item.proofFileName, item.proofFileType) !== "none"),
      notes: null,
      submittedAt: formatDateTime(item.createdAt),
      sortTime: item.createdAt.getTime()
    }))
  ].sort((first, second) => first.sortTime - second.sortTime).map(({ sortTime: _sortTime, ...item }) => item);
}

export async function getAdminOverview() {
  const [volunteerCount, files, pendingHourApplications, tutorials, tasks] = await Promise.all([
    prisma.user.count({ where: { role: "VOLUNTEER", deletedAt: null } }),
    getFiles(),
    getPendingHourReviewItems(),
    getTutorials(),
    getTasks()
  ]);

  return {
    volunteerCount,
    files,
    pendingHourApplications,
    tutorials,
    tasks
  };
}

function formatTask(task: {
  id: string;
  title: string;
  description: string;
  startTime: Date | null;
  endTime: Date | null;
  startClockTime: string | null;
  endClockTime: string | null;
  deadline: Date | null;
  status: string;
  maxMembers: number | null;
  estimatedHours: number | null;
  needProof: boolean;
  allowCancel: boolean;
  cancelNeedsReview: boolean;
  createdAt: Date;
  createdBy: { name: string };
  taskType: { id: string; name: string };
  signups: unknown[];
}) {
  const signupCount = task.signups.filter((signup) => (signup as { status?: string }).status !== "CANCELLED").length;
  const maxMembers = task.maxMembers ?? 0;

  return {
    id: task.id,
    title: task.title,
    typeId: task.taskType.id,
    type: task.taskType.name,
    description: task.description,
    startTime: task.startTime ? formatScheduledDate(task.startTime, task.startClockTime) : "-",
    endTime: task.endTime ? formatScheduledDate(task.endTime, task.endClockTime) : "-",
    deadline: task.deadline ? formatDate(task.deadline) : "-",
    createdAt: formatDateTime(task.createdAt),
    status: taskStatusLabels[task.status],
    members: `${signupCount}/${maxMembers || "-"}`,
    signupCount,
    maxMembers,
    estimatedHours: task.estimatedHours ?? "-",
    needProof: task.needProof,
    allowCancel: task.allowCancel,
    cancelNeedsReview: task.cancelNeedsReview,
    createdBy: task.createdBy.name
  };
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateTime(value: Date) {
  return value.toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatScheduledDate(value: Date, clockTime: string | null) {
  const date = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  return clockTime ? `${date} ${clockTime}` : date;
}
