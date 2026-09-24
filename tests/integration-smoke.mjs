import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (!databaseName.endsWith("_test")) throw new Error("Integration smoke may only use a *_test database");
const prisma = new PrismaClient();
const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const termCode = "2099-2100-1";
const subsetTermCode = "2098-2099-1";

async function api(path, method = "GET", body, cookie = "", origin = true) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(origin ? { Origin: base } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  return { status: response.status, result, cookie: response.headers.getSetCookie()[0]?.split(";", 1)[0] ?? "" };
}

function firstMonday(year) {
  const date = new Date(Date.UTC(year, 7, 25));
  date.setUTCDate(date.getUTCDate() + (8 - date.getUTCDay()) % 7);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const admin = await api("/api/auth", "POST", { username: "admin1", password: "123456" });
  const volunteer = await api("/api/auth", "POST", { username: "volunteer1", password: "123456" });
  assert.equal(admin.status, 200);
  assert.equal(volunteer.status, 200);
  const startDate = firstMonday(2099);
  const volunteers = await prisma.user.findMany({ where: { username: { in: ["volunteer1", "volunteer2"] } } });
  assert.equal(volunteers.length, 2);
  const [one, two] = ["volunteer1", "volunteer2"].map((username) => volunteers.find((user) => user.username === username));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    [`学年学期：${termCode}`],
    ["时间", "星期一", "星期二", "星期三", "星期四", "星期五"],
    ["08:00-09:40", "测试课\n1-2周", "", "", "", ""],
    ["10:10-11:50", "", "", "", "", ""],
    ["14:00-15:40", "", "", "", "", ""],
    ["16:10-17:50", "", "", "", "", ""]
  ]), "课表");
  const upload = new FormData();
  upload.append("file", new File([XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })], "smoke.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const uploadResponse = await fetch(`${base}/api/schedules`, { method: "POST", headers: { Origin: base, Cookie: volunteer.cookie }, body: upload });
  assert.equal(uploadResponse.status, 200, await uploadResponse.text());
  assert.equal((await prisma.volunteerSchedule.findUniqueOrThrow({ where: { userId: one.id } })).source, "EXCEL");
  await prisma.academicTerm.deleteMany({ where: { code: termCode } });
  await prisma.academicTerm.deleteMany({ where: { code: subsetTermCode } });
  for (const user of [one, two]) {
    await prisma.volunteerSchedule.deleteMany({ where: { userId: user.id } });
    await prisma.volunteerSchedule.create({ data: { userId: user.id, academicTerm: termCode, sourceFileName: "smoke.xlsx", fileSize: 100, source: "EXCEL", courses: { create: user.id === one.id ? [{ dayOfWeek: 1, startTime: "08:00", endTime: "09:00", courseName: "测试课程", details: "", weeks: "[1]", originalText: "测试课程" }] : [] } } });
  }
  try {
    const templates = [
      { dayOfWeek: 1, startTime: "08:00", endTime: "09:00", location: "测试地点", requiredCount: 1 },
      { dayOfWeek: 1, startTime: "10:00", endTime: "11:00", location: "测试地点", requiredCount: 1 }
    ];
    const config = { code: termCode, startDate, weekCount: 2, templates, candidateIds: [one.id] };
    assert.equal((await api("/api/roster/terms", "POST", config, volunteer.cookie)).status, 403);
    assert.equal((await api("/api/roster/terms", "POST", config, admin.cookie, false)).status, 403);
    const saved = await api("/api/roster/terms", "POST", config, admin.cookie);
    assert.equal(saved.status, 200);
    const termId = saved.result.id;
    const incomplete = await api("/api/roster/generate", "POST", { termId }, admin.cookie);
    assert.equal(incomplete.status, 200);
    assert.ok(incomplete.result.vacancies > 0);
    assert.equal((await api("/api/roster/publish", "POST", { termId }, admin.cookie)).status, 409);
    assert.equal((await api("/api/roster/terms", "POST", { ...config, candidateIds: [one.id, two.id] }, admin.cookie)).status, 200);
    const complete = await api("/api/roster/generate", "POST", { termId }, admin.cookie);
    assert.equal(complete.status, 200);
    assert.equal(complete.result.vacancies, 0);
    const draft = await api("/api/roster", "GET", undefined, admin.cookie);
    const shifts = draft.result.terms.find((term) => term.id === termId).roster.shifts;
    const firstShift = shifts.find((shift) => shift.week === 1 && shift.startTime === "08:00");
    assert.deepEqual(firstShift.assignments.map((person) => person.id), [two.id]);
    assert.equal((await api(`/api/roster/shifts/${firstShift.id}`, "PUT", { userIds: [one.id] }, admin.cookie)).status, 400);
    const secondShift = shifts.find((shift) => shift.week === 1 && shift.startTime === "10:00");
    assert.equal((await api(`/api/roster/shifts/${secondShift.id}`, "PUT", { userIds: [two.id] }, admin.cookie)).status, 400);
    assert.equal((await api(`/api/roster/shifts/${secondShift.id}`, "PUT", { userIds: [] }, admin.cookie)).status, 200);
    assert.equal((await api("/api/roster/publish", "POST", { termId }, admin.cookie)).status, 409);
    assert.equal((await api(`/api/roster/shifts/${secondShift.id}`, "PUT", { userIds: [one.id] }, admin.cookie)).status, 200);
    assert.equal((await api("/api/roster/publish", "POST", { termId }, admin.cookie)).status, 200);
    assert.equal((await api(`/api/roster/shifts/${firstShift.id}`, "PUT", { userIds: [two.id] }, admin.cookie)).status, 409);
    const visible = await api("/api/roster", "GET", undefined, volunteer.cookie);
    assert.equal(visible.status, 200);
    assert.equal(visible.result.terms.find((term) => term.id === termId).roster.status, "PUBLISHED");
    assert.ok(!/studentId|phone|volunteerSchedule/.test(JSON.stringify(visible.result)));
    const schedule = await prisma.volunteerSchedule.findUniqueOrThrow({ where: { userId: two.id } });
    await prisma.scheduleCourse.create({ data: { scheduleId: schedule.id, dayOfWeek: 1, startTime: "08:30", endTime: "09:30", courseName: "新课", details: "", weeks: "[1]", originalText: "新课" } });
    const changed = await api("/api/roster", "GET", undefined, admin.cookie);
    assert.ok(changed.result.conflicts.some((conflict) => conflict.shiftId === firstShift.id && conflict.userId === two.id));
    await prisma.campusSession.upsert({ where: { userId: one.id }, create: { userId: one.id, encryptedCookies: "expired-fixture", expiresAt: new Date(0) }, update: { encryptedCookies: "expired-fixture", expiresAt: new Date(0), status: "ACTIVE" } });
    assert.equal((await api("/api/schedules/ccnu", "PUT", { term: termCode }, volunteer.cookie)).status, 400);
    assert.ok(await prisma.volunteerSchedule.findUnique({ where: { userId: one.id } }));
    const expired = await prisma.campusSession.findUniqueOrThrow({ where: { userId: one.id } });
    assert.equal(expired.status, "EXPIRED");
    assert.equal(expired.encryptedCookies, "");
    const subset = await api("/api/roster/terms", "POST", { code: subsetTermCode, startDate: firstMonday(2098), weekCount: 3, scheduleWeeks: [2], templates: [templates[0]], candidateIds: [two.id] }, admin.cookie);
    assert.equal(subset.status, 200);
    const subsetResult = await api("/api/roster/generate", "POST", { termId: subset.result.id }, admin.cookie);
    assert.equal(subsetResult.status, 200);
    assert.equal(subsetResult.result.shiftCount, 1);
    const subsetRoster = await api("/api/roster", "GET", undefined, admin.cookie);
    assert.equal(subsetRoster.result.terms.find((term) => term.id === subset.result.id).roster.shifts[0].week, 2);
    console.log("MySQL/API smoke passed: auth, origin, roles, Excel upload, vacancy, adjustment, publish, visibility, conflict, expired campus session");
  } finally {
    await prisma.academicTerm.deleteMany({ where: { code: termCode } });
    await prisma.academicTerm.deleteMany({ where: { code: subsetTermCode } });
    await prisma.campusSession.deleteMany({ where: { userId: one.id } });
    await prisma.volunteerSchedule.deleteMany({ where: { userId: { in: [one.id, two.id] } } });
  }
}

try { await main(); }
finally { await prisma.$disconnect(); }
