/** 项目导读：接口路由 /api/hour-applications：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/app/api/_utils";
import { prisma } from "@/lib/db";
import { isVolunteer } from "@/lib/permissions";
import { validateResourceName } from "@/lib/resource-drive";
import { removeHourProofStorageKeys } from "@/lib/hour-proof-storage";
import { getHourProofArtifactKeys, storeHourProofFile } from "@/lib/hour-proof-preview";

export const runtime = "nodejs";

const MAX_PROOF_SIZE = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) return auth.response;
  if (!isVolunteer(auth.user.role)) return NextResponse.json({ message: "只有志愿者可以申请志愿时长" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ message: "无法读取申请内容" }, { status: 400 });

  const workContent = readText(form, "workContent");
  const notes = readText(form, "notes");
  const hours = Number(readText(form, "hours"));
  const serviceDate = readText(form, "serviceDate") || readText(form, "serviceStartDate");
  const serviceStartAt = parseServiceDate(serviceDate);
  const serviceEndAt = serviceStartAt;
  const proof = form.get("proof");

  if (!workContent || workContent.length > 2000) return NextResponse.json({ message: "请填写 2000 字以内的志愿服务内容" }, { status: 400 });
  if (!serviceStartAt || !serviceEndAt) return NextResponse.json({ message: "请选择有效的服务日期" }, { status: 400 });
  if (!hours || hours <= 0 || hours * 2 !== Math.floor(hours * 2)) return NextResponse.json({ message: "志愿时长必须大于 0，且为 0.5 小时的倍数" }, { status: 400 });
  if (notes.length > 2000) return NextResponse.json({ message: "备注不能超过 2000 字" }, { status: 400 });
  if (proof instanceof File && proof.size > MAX_PROOF_SIZE) return NextResponse.json({ message: "辅助证明材料不能超过 20MB" }, { status: 413 });
  const proofName = proof instanceof File && proof.size > 0 ? validateResourceName(proof.name) : null;
  if (proof instanceof File && proof.size > 0 && !proofName) return NextResponse.json({ message: "证明材料文件名无效" }, { status: 400 });

  const activityName = workContent.split(/\r?\n/).find(Boolean)?.slice(0, 120) || "志愿服务时长申请";
  let application = await prisma.volunteerHour.create({
    data: {
      userId: auth.user.id,
      activityName,
      workContent,
      serviceStartAt,
      serviceEndAt,
      serviceStartClockTime: null,
      serviceEndClockTime: null,
      hours,
      notes: notes || null,
      status: "PENDING"
    }
  });
  let proofKey: string | null = null;
  let previewFailed = false;

  try {
    if (proof instanceof File && proof.size > 0 && proofName) {
      const storedProof = await storeHourProofFile(proof, "direct", auth.user.id, application.id, proofName);
      proofKey = storedProof.proofFileUrl;
      previewFailed = storedProof.previewFailed;
      application = await prisma.volunteerHour.update({
        where: { id: application.id },
        data: { proofFileUrl: storedProof.proofFileUrl, proofFileName: storedProof.proofFileName, proofFileType: storedProof.proofFileType, proofFileSize: storedProof.proofFileSize }
      });
    }

    const reviewers = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" }, select: { id: true } });
    if (reviewers.length) {
      await prisma.message.createMany({
        data: reviewers.map((reviewer) => ({
          receiverId: reviewer.id,
          senderId: auth.user!.id,
          title: "新的志愿时长申请",
          content: `提交人：${auth.user!.name}\n服务内容：${activityName}\n申请时长：${hours} 小时`,
          category: "APPLICATION" as const,
          relatedUrl: "/admin/tasks/hours/review"
        }))
      });
    }
  } catch (error) {
    await prisma.volunteerHour.delete({ where: { id: application.id } }).catch(() => undefined);
    await removeHourProofStorageKeys([proofKey, ...getHourProofArtifactKeys("direct", application.id, proofKey)]);
    return NextResponse.json({ message: error instanceof Error ? error.message : "申请提交失败" }, { status: 500 });
  }

  return NextResponse.json({ data: application, message: previewFailed ? "申请已提交，但证明材料预览生成失败，仍可下载原文件" : "志愿时长申请已提交，等待部门负责人审核" }, { status: 201 });
}

function readText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseServiceDate(dateValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
