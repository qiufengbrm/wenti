import { prisma } from "@/lib/db";
import { authorizeCcnu, decryptCookies, encryptCookies, fetchCcnuSchedule } from "@/lib/ccnu";

async function saveSchedule(userId: string, term: string, courses: Awaited<ReturnType<typeof fetchCcnuSchedule>>) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.volunteerSchedule.deleteMany({ where: { userId } });
    await tx.volunteerSchedule.create({ data: {
      userId, academicTerm: term, sourceFileName: "华师本科智慧教务", fileSize: 0, source: "CCNU", syncedAt: now,
      courses: { create: courses.map((course) => ({ ...course, weeks: JSON.stringify(course.weeks) })) }
    } });
    await tx.campusSession.update({ where: { userId }, data: { status: "ACTIVE", lastSyncedAt: now } });
  });
  return courses.length;
}

export async function authorizeAndSync(userId: string, studentId: string, username: string, password: string, term: string) {
  if (!studentId || username !== studentId) throw new Error("请输入与本站学号一致的校内账号");
  const authorization = await authorizeCcnu(username, password);
  if (authorization.studentId !== studentId) throw new Error("校内返回的学号与本站账号不一致");
  const courses = await fetchCcnuSchedule(authorization.cookies, term);
  await prisma.campusSession.upsert({
    where: { userId },
    create: { userId, encryptedCookies: encryptCookies(authorization.cookies), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), status: "ACTIVE" },
    update: { encryptedCookies: encryptCookies(authorization.cookies), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), status: "ACTIVE" }
  });
  return saveSchedule(userId, term, courses);
}

export async function refreshCampusSchedule(userId: string, term: string) {
  const session = await prisma.campusSession.findUnique({ where: { userId } });
  if (!session || session.expiresAt <= new Date() || session.status !== "ACTIVE") {
    if (session) await prisma.campusSession.update({ where: { userId }, data: { status: "EXPIRED", encryptedCookies: "" } });
    throw new Error("校内授权已失效，请成员重新授权");
  }
  let courses: Awaited<ReturnType<typeof fetchCcnuSchedule>>;
  try {
    courses = await fetchCcnuSchedule(decryptCookies(session.encryptedCookies), term);
  } catch {
    await prisma.campusSession.update({ where: { userId }, data: { status: "EXPIRED", encryptedCookies: "" } });
    throw new Error("校内授权已失效，请成员重新授权；上一次有效课表已保留");
  }
  return saveSchedule(userId, term, courses);
}

export async function refreshAllCampusSchedules(term: string) {
  const sessions = await prisma.campusSession.findMany({ where: { user: { role: "VOLUNTEER", status: "ACTIVE", deletedAt: null } }, select: { userId: true } });
  const result = { refreshed: 0, needsAuthorization: [] as string[] };
  for (const session of sessions) {
    try { await refreshCampusSchedule(session.userId, term); result.refreshed += 1; }
    catch { result.needsAuthorization.push(session.userId); }
  }
  return result;
}
