/** 项目导读：任务流程组件：处理报名、取消、提交和审核；状态一步一步走，不能坐电梯乱窜楼层。 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";
import { ProofFilePicker } from "@/components/hours/ProofFilePicker";

interface TaskLike {
  id: string;
  title: string;
  allowCancel: boolean;
}

interface SignupLike {
  id: string;
  taskId: string;
  userId: string;
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

type ActionFeedback = {
  tone: "success" | "warning" | "info";
  title: string;
};

export function VolunteerTaskWorkflow({
  task,
  initialSignup,
  mode = "full"
}: {
  task: TaskLike;
  initialSignup?: SignupLike;
  mode?: "signup" | "full";
}) {
  const router = useRouter();
  const [signup, setSignup] = useState<SignupLike | undefined>(initialSignup);
  const [actualHours, setActualHours] = useState("");
  const [proofDescription, setProofDescription] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [cancelReason, setCancelReason] = useState(initialSignup?.cancelReason === "-" ? "" : initialSignup?.cancelReason ?? "");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"signup" | "submit" | "cancel" | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const signupRecord = useMemo(() => (signup ? [signup] : []), [signup]);
  const hasSignup = Boolean(signup && signup.status !== "已取消");
  const isBusy = pendingAction !== null;
  const proofSubmitted = signup?.status === "待审核" || signup?.status === "已通过";
  const cancelSubmitted = signup?.cancelStatus === "待审核";

  useEffect(() => {
    if (!actionFeedback) return;

    const timer = window.setTimeout(() => {
      setActionFeedback(null);
    }, actionFeedback.tone === "info" ? 1800 : 3200);

    return () => window.clearTimeout(timer);
  }, [actionFeedback]);

  async function handleSignup() {
    if (isBusy) return;

    if (hasSignup) {
      const tip = "你已经接取过该任务";
      setMessage("你已经接取过该任务，不能重复接取。");
      setActionFeedback({ tone: "warning", title: tip });
      return;
    }

    setPendingAction("signup");
    setMessage("正在接取任务，请稍候...");
    setActionFeedback({ tone: "info", title: "正在接取" });

    try {
      const response = await fetch(`/api/tasks/${task.id}/signup`, { method: "POST" });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        const errorMessage = result.message ?? "接取失败";
        setMessage(errorMessage);
        setActionFeedback({ tone: "warning", title: errorMessage });
        return;
      }

      const now = formatNow();
      setSignup({
        id: "local_signup",
        taskId: task.id,
        userId: "u_volunteer_1",
        user: "志愿者测试账号1",
        studentId: "volunteer1",
        status: "已接取",
        signupAt: now,
        submittedAt: "-",
        actualHours: "-",
        proofFileName: "-",
        proofDescription: "-",
        cancelReason: "-",
        cancelRequestedAt: "-",
        cancelStatus: "-"
      });
      const successMessage = result.message ?? "已接取任务。后续如果申请取消，需要由发布任务的部门负责人审核。";
      setMessage(successMessage);
      setActionFeedback({ tone: "success", title: "接取成功" });
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  }

  function handleStartFinish() {
    if (!signup) {
      const tip = "请先接取任务";
      setMessage("请先接取任务，再提交完成证明。");
      setActionFeedback({ tone: "warning", title: tip });
      return;
    }

    const tip = "请在下方填写实际完成时长和完成证明，提交后将通知发布任务的部门负责人审核。";
    setMessage(tip);
    setActionFeedback({ tone: "info", title: "填写志愿时长" });
  }

  async function handleSubmitProof() {
    if (isBusy) return;

    if (!signup) {
      const tip = "请先接取任务";
      setMessage("请先接取任务，再提交完成证明。");
      setActionFeedback({ tone: "warning", title: tip });
      return;
    }

    const hours = Number(actualHours);
    if (!hours || hours <= 0 || hours * 2 !== Math.floor(hours * 2)) {
      const tip = "时长需为 0.5 小时倍数";
      setMessage("实际完成时长必须大于 0，且为 0.5 小时的倍数。");
      setActionFeedback({ tone: "warning", title: tip });
      return;
    }

    setPendingAction("submit");
    setMessage("正在提交完成证明，请稍候...");
    setActionFeedback({ tone: "info", title: "正在提交" });

    try {
      if (proofFile && proofFile.size > 20 * 1024 * 1024) {
        setMessage("完成证明不能超过 20MB");
        setActionFeedback({ tone: "warning", title: "文件过大" });
        return;
      }
      const form = new FormData();
      form.append("actualHours", String(hours));
      form.append("description", proofDescription);
      if (proofFile) form.append("proof", proofFile);
      const response = await fetch(`/api/tasks/${task.id}/submit`, { method: "POST", body: form });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        const errorMessage = result.message ?? "提交失败";
        setMessage(errorMessage);
        setActionFeedback({ tone: "warning", title: errorMessage });
        return;
      }

      setSignup({
        ...signup,
        status: "待审核",
        submittedAt: formatNow(),
        actualHours: actualHours,
        proofFileName: proofFile?.name || "-",
        proofDescription: proofDescription || "已提交完成证明，等待发布任务的部门负责人审核。"
      });
      const successMessage = result.message ?? "完成证明和实际时长已提交，已通知发布任务的部门负责人审核。审核通过后才会计入志愿时长。";
      setMessage(successMessage);
      setActionFeedback({ tone: "success", title: "提交成功" });
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCancelRequest() {
    if (isBusy) return;

    if (!signup) {
      const tip = "你尚未接取该任务";
      setMessage("你尚未接取该任务，不需要申请取消。");
      setActionFeedback({ tone: "warning", title: tip });
      return;
    }

    if (cancelSubmitted) {
      const tip = "取消申请待审核";
      setMessage("");
      setActionFeedback({ tone: "warning", title: tip });
      return;
    }

    if (!task.allowCancel) {
      const tip = "不可申请取消";
      setMessage("该任务发布时未开启取消申请。");
      setActionFeedback({ tone: "warning", title: tip });
      return;
    }

    if (!cancelReason.trim()) {
      const tip = "请填写取消原因";
      setMessage("请先填写取消原因。");
      setActionFeedback({ tone: "warning", title: tip });
      return;
    }

    setPendingAction("cancel");
    setMessage("正在提交取消申请，请稍候...");
    setActionFeedback({ tone: "info", title: "正在提交" });

    try {
      const response = await fetch(`/api/tasks/${task.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason })
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        const errorMessage = result.message ?? "提交失败";
        setMessage(errorMessage);
        setActionFeedback({ tone: "warning", title: errorMessage });
        return;
      }

      setSignup({
        ...signup,
        cancelReason,
        cancelRequestedAt: formatNow(),
        cancelStatus: "待审核"
      });
      const successMessage = result.message ?? "取消申请已提交，已通知发布任务的部门负责人审核；审核前任务仍视为已接取。";
      setMessage(successMessage);
      setActionFeedback({ tone: "success", title: "取消申请已提交" });
      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    } finally {
      setPendingAction(null);
    }
  }

  if (mode === "signup") {
    if (hasSignup) {
      return actionFeedback ? <ActionFeedbackToast feedback={actionFeedback} /> : null;
    }

    return (
      <>
        {actionFeedback ? <ActionFeedbackToast feedback={actionFeedback} /> : null}
        <div className="mt-4 flex justify-end">
          <Button className="h-10 min-w-40 text-base" disabled={isBusy} onClick={handleSignup}>
            {pendingAction === "signup" ? "正在接取..." : "接取任务"}
          </Button>
        </div>
      </>
    );
  }

  if (!hasSignup) {
    return actionFeedback ? <ActionFeedbackToast feedback={actionFeedback} /> : null;
  }

  return (
    <>
      {actionFeedback ? <ActionFeedbackToast feedback={actionFeedback} /> : null}
      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-950">任务操作</h2>
        {message ? <div className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</div> : null}
        <div className="grid gap-3 md:grid-cols-[1fr_160px] md:items-center">
          <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
            已接取该任务，可以提交完成证明；如无法参与，可按要求提交取消申请。
          </div>
          <Button className="h-10 w-full" disabled={isBusy} onClick={handleStartFinish} variant="secondary">
            完成任务
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-950">完成证明提交</h2>
          <div className="grid gap-3">
            <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              提交后将通知发布任务的部门负责人审核；审核通过后，实际时长才会计入我的志愿时长。
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              实际完成时长
              <input
                className="h-10 rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500"
                min={0.5}
                onChange={(event) => setActualHours(event.target.value)}
                step={0.5}
                type="number"
                value={actualHours}
              />
            </label>
            <div className="grid gap-2 text-sm font-medium text-slate-700">
              <span>完成证明</span>
              <ProofFilePicker allowVideo disabled={isBusy || proofSubmitted} file={proofFile} onChange={setProofFile} />
              <span className="text-xs font-normal text-slate-400">支持图片、视频、PDF、Office 文件和 ZIP，最大 20MB</span>
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              完成说明
              <textarea
                className="min-h-20 rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                onChange={(event) => setProofDescription(event.target.value)}
                placeholder="填写任务完成情况、附件说明或补充信息"
                value={proofDescription}
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={isBusy || proofSubmitted} onClick={handleSubmitProof}>
              {pendingAction === "submit" ? "正在提交..." : proofSubmitted ? "已提交待审核" : "提交完成证明"}
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-950">取消申请</h2>
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              取消原因
              <textarea
                className="min-h-20 rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="说明无法参与任务的原因，提交后将通知发布任务的部门负责人审核"
                value={cancelReason}
              />
            </label>
            <div className="flex justify-end">
              <Button disabled={isBusy} onClick={handleCancelRequest} variant="secondary">
                {pendingAction === "cancel" ? "正在提交..." : cancelSubmitted ? "取消申请待审核" : "提交取消申请"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-950">我的提交记录</h2>
        <DataTable
          columns={[
            { key: "status", header: "任务状态" },
            { key: "submittedAt", header: "提交时间" },
            { key: "actualHours", header: "实际时长" },
            { key: "proofFileName", header: "完成证明" },
            { key: "proofDescription", header: "说明" },
            { key: "cancelStatus", header: "取消申请" },
            { key: "cancelReason", header: "取消原因" }
          ]}
          data={signupRecord}
          emptyText="暂无提交记录"
        />
      </Card>
    </>
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
