/** 项目导读：任务流程组件：处理报名、取消、提交和审核；状态一步一步走，不能坐电梯乱窜楼层。 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";

interface SignupLike {
  id: string;
  taskId: string;
  taskTitle?: string;
  taskType?: string;
  user: string;
  studentId: string;
  status: string;
  signupAt: string;
  submittedAt: string;
  actualHours: string;
  proofFileName: string;
  proofDescription: string;
  cancelReason?: string;
  cancelRequestedAt?: string;
  cancelStatus?: string;
}

interface NotificationLike {
  id: string;
  receiver?: string;
  title: string;
  content: string;
  status: string;
  date: string;
}

type ActionFeedback = {
  tone: "success" | "warning" | "info";
  title: string;
};

export function AdminTaskReviewBoard({
  initialSignups,
  initialNotifications,
  variant = "detail"
}: {
  initialSignups: SignupLike[];
  initialNotifications: NotificationLike[];
  variant?: "detail" | "summary";
}) {
  const router = useRouter();
  const [signups, setSignups] = useState(initialSignups);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [message, setMessage] = useState("");
  const [pendingReview, setPendingReview] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const cancelRequests = useMemo(() => signups.filter((item) => item.cancelStatus === "待审核"), [signups]);
  const completionReviews = useMemo(() => signups.filter((item) => item.status === "待审核"), [signups]);
  const isBusy = pendingReview !== null;

  useEffect(() => {
    if (!actionFeedback) return;

    const timer = window.setTimeout(() => {
      setActionFeedback(null);
    }, actionFeedback.tone === "info" ? 1800 : 3200);

    return () => window.clearTimeout(timer);
  }, [actionFeedback]);

  async function reviewCancel(signupId: string, approved: boolean) {
    if (isBusy) return;

    const target = signups.find((item) => item.id === signupId);
    if (!target) return;

    setPendingReview(`${signupId}:cancel:${approved ? "approve" : "reject"}`);
    setActionFeedback({ tone: "info", title: "正在审核" });
    setMessage("正在审核取消申请，请稍候...");

    try {
      const response = await fetch(`/api/tasks/${target.taskId}/cancel-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId, approved })
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        const errorMessage = result.message ?? "审核失败";
        setMessage(errorMessage);
        setActionFeedback({ tone: "warning", title: errorMessage });
        return;
      }

      setSignups((current) =>
        current.map((item) =>
          item.id === signupId
            ? {
                ...item,
                status: approved ? "已取消" : item.status,
                cancelStatus: approved ? "已同意" : "已驳回"
              }
            : item
        )
      );
      addNotification(target.user, approved ? "取消申请已同意" : "取消申请已驳回", approved ? "部门负责人已同意你的任务取消申请。" : "部门负责人驳回了你的任务取消申请，请按时参加任务。");
      setMessage(result.message ?? (approved ? "已同意取消申请，并通知志愿者。" : "已驳回取消申请，并通知志愿者。"));
      setActionFeedback({ tone: "success", title: approved ? "已同意取消" : "已驳回申请" });
      router.refresh();
    } finally {
      setPendingReview(null);
    }
  }

  async function reviewCompletion(signupId: string, approved: boolean) {
    if (isBusy) return;

    const target = signups.find((item) => item.id === signupId);
    if (!target) return;

    setPendingReview(`${signupId}:completion:${approved ? "approve" : "reject"}`);
    setActionFeedback({ tone: "info", title: "正在审核" });
    setMessage("正在审核志愿时长，请稍候...");

    try {
      const response = await fetch(`/api/tasks/${target.taskId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId, approved })
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        const errorMessage = result.message ?? "审核失败";
        setMessage(errorMessage);
        setActionFeedback({ tone: "warning", title: errorMessage });
        return;
      }

      setSignups((current) =>
        current.map((item) =>
          item.id === signupId
            ? {
                ...item,
                status: approved ? "已通过" : "已驳回"
              }
            : item
        )
      );
      addNotification(
        target.user,
        approved ? "任务志愿时长审核通过" : "任务完成证明被驳回",
        approved ? `你提交的实际时长 ${target.actualHours} 小时已通过审核并计入志愿时长。` : "你的完成证明或实际时长被驳回，请修改后重新提交。"
      );
      setMessage(result.message ?? (approved ? "已通过完成证明和实际时长，系统将写入志愿时长并通知志愿者。" : "已驳回完成证明，已通知志愿者重新提交。"));
      setActionFeedback({ tone: "success", title: approved ? "审核通过" : "已驳回" });
      router.refresh();
    } finally {
      setPendingReview(null);
    }
  }

  function addNotification(receiver: string, title: string, content: string) {
    setNotifications((current) => [
      {
        id: `local_${current.length + 1}`,
        receiver,
        title,
        content,
        status: "未读",
        date: formatNow()
      },
      ...current
    ]);
  }

  return (
    <div className={variant === "summary" ? "grid gap-4" : "mt-6 grid gap-6"}>
      {actionFeedback ? <ActionFeedbackToast feedback={actionFeedback} /> : null}
      {message ? <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</div> : null}
      <Card className={variant === "summary" ? "p-4" : undefined}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={variant === "summary" ? "text-base font-semibold text-slate-950" : "text-lg font-semibold"}>取消申请审核</h2>
          {variant === "summary" ? <span className="text-sm text-slate-500">{cancelRequests.length} 条</span> : null}
        </div>
        <DataTable
          columns={[
            ...(variant === "summary" ? [{ key: "taskTitle", header: "任务" }] : []),
            { key: "user", header: "志愿者" },
            ...(variant === "summary" ? [] : [{ key: "studentId", header: "学号" }]),
            { key: "cancelRequestedAt", header: "时间" },
            { key: "cancelReason", header: "取消原因" },
            ...(variant === "summary" ? [] : [{ key: "cancelStatus", header: "状态" }]),
            {
              key: "actions",
              header: "审核",
              render: (row) => (
                <div className="flex gap-2">
                  <Button disabled={isBusy} onClick={() => reviewCancel(row.id, true)} variant="secondary">
                    {pendingReview === `${row.id}:cancel:approve` ? "正在审核..." : "同意取消"}
                  </Button>
                  <Button disabled={isBusy} onClick={() => reviewCancel(row.id, false)} variant="ghost">
                    {pendingReview === `${row.id}:cancel:reject` ? "正在审核..." : "驳回申请"}
                  </Button>
                </div>
              )
            }
          ]}
          data={cancelRequests}
          emptyText="暂无取消申请"
        />
      </Card>
      <Card className={variant === "summary" ? "p-4" : undefined}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={variant === "summary" ? "text-base font-semibold text-slate-950" : "text-lg font-semibold"}>完成证明与实际时长审核</h2>
          {variant === "summary" ? <span className="text-sm text-slate-500">{completionReviews.length} 条</span> : null}
        </div>
        <DataTable
          columns={[
            ...(variant === "summary" ? [{ key: "taskTitle", header: "任务" }] : []),
            { key: "user", header: "志愿者" },
            ...(variant === "summary" ? [] : [{ key: "studentId", header: "学号" }, { key: "status", header: "状态" }, { key: "signupAt", header: "接取时间" }]),
            { key: "submittedAt", header: "提交时间" },
            { key: "actualHours", header: "实际时长" },
            { key: "proofDescription", header: "完成说明" },
            {
              key: "actions",
              header: "审核",
              render: (row) => (
                <div className="flex gap-2">
                  <Button disabled={isBusy} onClick={() => reviewCompletion(row.id, true)} variant="secondary">
                    {pendingReview === `${row.id}:completion:approve` ? "正在审核..." : "通过并计入志愿时长"}
                  </Button>
                  <Button disabled={isBusy} onClick={() => reviewCompletion(row.id, false)} variant="ghost">
                    {pendingReview === `${row.id}:completion:reject` ? "正在审核..." : "驳回"}
                  </Button>
                </div>
              )
            }
          ]}
          data={completionReviews}
          emptyText="暂无待审核完成证明"
        />
      </Card>
      {variant === "detail" ? (
        <>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">全部报名记录</h2>
            <DataTable
              columns={[
                { key: "user", header: "志愿者" },
                { key: "studentId", header: "学号" },
                { key: "status", header: "任务状态" },
                { key: "signupAt", header: "接取时间" },
                { key: "submittedAt", header: "提交时间" },
                { key: "actualHours", header: "实际时长" },
                { key: "cancelStatus", header: "取消申请" }
              ]}
              data={signups}
              emptyText="暂无报名记录"
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">相关通知</h2>
            <DataTable
              columns={[
                { key: "receiver", header: "接收人" },
                { key: "title", header: "消息标题" },
                { key: "content", header: "内容" },
                { key: "status", header: "状态" },
                { key: "date", header: "时间" }
              ]}
              data={notifications}
              emptyText="暂无通知"
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}

function ActionFeedbackToast({ feedback }: { feedback: ActionFeedback }) {
  return (
    <div
      className={cn(
        "apple-material fixed left-1/2 top-5 z-50 w-[min(340px,calc(100vw-32px))] -translate-x-1/2 rounded-[14px] border px-5 py-3.5 text-center shadow-floating",
        feedback.tone === "success" ? "border-[#34c759]/20 text-[#248a3d]" : "",
        feedback.tone === "warning" ? "border-[#ff9f0a]/25 text-[#a05a00]" : "",
        feedback.tone === "info" ? "border-[#0071e3]/20 text-[#0066cc]" : ""
      )}
      role="status"
    >
      <p className="text-[14px] font-semibold">{feedback.title}</p>
    </div>
  );
}

function formatNow() {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}
