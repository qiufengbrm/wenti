/** 项目导读：接口路由 /api/tasks/[id]/submit：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { isVolunteer } from "@/lib/permissions";
import { validateResourceName } from "@/lib/resource-drive";
import { removeStoredKeys } from "@/lib/resource-storage";
import { getHourProofArtifactKeys, storeHourProofFile } from "@/lib/hour-proof-preview";

export const runtime = "nodejs";

const MAX_PROOF_SIZE = 20 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;

  if (!isVolunteer(auth.user.role)) {
    return NextResponse.json({ message: "只有普通志愿者可以提交完成证明" }, { status: 403 });
  }

  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  let proof: File | null = null;
  let payload: {
    actualHours?: number;
    description?: string;
    proofFileName?: string;
    proofFileUrl?: string;
    proofFileType?: string;
    proofFileSize?: number;
  };
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ message: "无法读取提交内容" }, { status: 400 });
    const value = form.get("proof");
    proof = value instanceof File && value.size > 0 ? value : null;
    payload = {
      actualHours: Number(form.get("actualHours")),
      description: typeof form.get("description") === "string" ? String(form.get("description")) : undefined
    };
  } else {
    payload = (await request.json().catch(() => ({}))) as typeof payload;
  }

  if (!payload.actualHours || payload.actualHours <= 0 || payload.actualHours * 2 !== Math.floor(payload.actualHours * 2)) {
    return NextResponse.json({ message: "实际完成时长必须大于 0，且为 0.5 小时的倍数。" }, { status: 400 });
  }
  if (proof && proof.size > MAX_PROOF_SIZE) return NextResponse.json({ message: "完成证明不能超过 20MB" }, { status: 413 });
  const proofName = proof ? validateResourceName(proof.name) : payload.proofFileName || null;
  if (proof && !proofName) return NextResponse.json({ message: "证明材料文件名无效" }, { status: 400 });

  const signup = await prisma.taskSignup.findUnique({
    where: { taskId_userId: { taskId: id, userId: auth.user.id } },
    include: { task: true, user: true }
  });

  if (!signup) {
    return NextResponse.json({ message: "请先接取任务，再提交完成证明。" }, { status: 400 });
  }

  if (signup.status === "CANCELLED") {
    return NextResponse.json({ message: "该任务已取消，不能提交完成证明。" }, { status: 400 });
  }

  if (signup.status === "CANCEL_REQUESTED") {
    return NextResponse.json({ message: "取消申请正在审核，不能提交完成证明。" }, { status: 400 });
  }

  if (signup.status === "SUBMITTED") {
    return NextResponse.json({ message: "完成证明已提交，正在审核。" }, { status: 400 });
  }

  if (signup.status === "APPROVED") {
    return NextResponse.json({ message: "该任务已审核通过，不能重复提交。" }, { status: 400 });
  }

  if (!["SIGNED_UP", "REJECTED"].includes(signup.status)) {
    return NextResponse.json({ message: "当前任务状态不能提交完成证明。" }, { status: 400 });
  }

  let submission = await prisma.taskSubmission.create({
    data: {
      taskId: id,
      signupId: signup.id,
      userId: auth.user.id,
      actualHours: payload.actualHours,
      description: payload.description?.trim() || "已提交完成证明，等待发布任务的部门负责人审核。",
      proofFileName: proofName,
      proofFileUrl: payload.proofFileUrl || null,
      proofFileType: proof?.type || payload.proofFileType || null,
      proofFileSize: proof?.size || payload.proofFileSize || null,
      status: "PENDING"
    }
  });
  let proofKey: string | null = null;
  let previewFailed = false;

  try {
    if (proof && proofName) {
      const storedProof = await storeHourProofFile(proof, "task", auth.user.id, submission.id, proofName);
      proofKey = storedProof.proofFileUrl;
      previewFailed = storedProof.previewFailed;
      submission = await prisma.taskSubmission.update({
        where: { id: submission.id },
        data: { proofFileUrl: storedProof.proofFileUrl, proofFileName: storedProof.proofFileName, proofFileType: storedProof.proofFileType, proofFileSize: storedProof.proofFileSize }
      });
    }

    await prisma.$transaction([
      prisma.taskSignup.update({ where: { id: signup.id }, data: { status: "SUBMITTED" } }),
      prisma.message.create({
        data: {
          receiverId: signup.task.createdById,
          senderId: auth.user.id,
          title: "志愿时长申报",
          content: `提交人：${signup.user.name}\n项目：${signup.task.title}\n申报时长：${payload.actualHours} 小时\n说明：${payload.description?.trim() || "已提交志愿时长申报"}`,
          category: "APPLICATION",
          relatedUrl: `/admin/tasks/${id}`
        }
      })
    ]);
  } catch (error) {
    await prisma.taskSubmission.delete({ where: { id: submission.id } }).catch(() => undefined);
    await removeStoredKeys([proofKey, ...getHourProofArtifactKeys("task", submission.id)]);
    return NextResponse.json({ message: error instanceof Error ? error.message : "志愿时长申报提交失败" }, { status: 500 });
  }

  return NextResponse.json({ data: submission, message: previewFailed ? "申报已提交，但证明材料预览生成失败，仍可下载原文件" : "志愿时长申报已提交，已通知发布任务的部门负责人审核。" });
}
