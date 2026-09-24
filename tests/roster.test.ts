import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseCcnuCourses, parseWeekList } from "../src/lib/ccnu-parser";
import { conflictsWithCourse, dateForTeachingWeek } from "../src/lib/roster-core";
import { solveRoster } from "../src/lib/roster-solver";
import { decodeSession, encodeSession } from "../src/lib/session";
import { decryptCookies, encryptCookies, fetchCcnuSchedule } from "../src/lib/ccnu";

test("智慧教务课程解析单双周及节次钟点", () => {
  assert.deepEqual(parseWeekList("1-8单周"), [1, 3, 5, 7]);
  assert.deepEqual(parseWeekList("2-8双周"), [2, 4, 6, 8]);
  const courses = parseCcnuCourses({ code: 0, data: [{ kc_mc: "测试课程", sktime: "周一第1、2节{第1-8单周};周三第9-10节{第2,4,6周}", skddmc: "一号楼;二号楼" }] });
  assert.equal(courses.length, 2);
  assert.deepEqual([courses[0].dayOfWeek, courses[0].startTime, courses[0].endTime, courses[0].weeks], [1, "08:00", "09:40", [1, 3, 5, 7]]);
  assert.deepEqual([courses[1].dayOfWeek, courses[1].startTime, courses[1].endTime], [3, "18:30", "20:05"]);
  assert.throws(() => parseCcnuCourses({ code: 1, data: [] }));
});

test("智慧教务即使声明 HTML 也按实际 JSON 内容解析", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 0, data: [] }), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    assert.deepEqual(await fetchCcnuSchedule("JSESSIONID=test", "2026-2027-1"), []);
    globalThis.fetch = async () => new Response("<script>login</script>", { headers: { "Content-Type": "text/html" } });
    await assert.rejects(fetchCcnuSchedule("JSESSIONID=test", "2026-2027-1"), /登录页面/);
  } finally { globalThis.fetch = original; }
});

test("教学周跨月计算及课程时间边界", () => {
  assert.equal(dateForTeachingWeek("2026-08-31", 2, 7), "2026-09-13");
  const course = { dayOfWeek: 1, startTime: "08:00", endTime: "09:40", weeks: [1, 3] };
  assert.equal(conflictsWithCourse(course, { dayOfWeek: 1, week: 1, startTime: "09:39", endTime: "10:00" }), true);
  assert.equal(conflictsWithCourse(course, { dayOfWeek: 1, week: 1, startTime: "09:40", endTime: "10:00" }), false);
  assert.equal(conflictsWithCourse(course, { dayOfWeek: 1, week: 2, startTime: "08:00", endTime: "09:00" }), false);
});

test("登录会话签名与失效校验", async () => {
  process.env.SESSION_SECRET = "test-secret-for-session-signing-1234567890";
  const value = await encodeSession({ id: "u1", username: "alice", role: "volunteer" });
  assert.equal((await decodeSession(value))?.id, "u1");
  assert.equal(await decodeSession(`${value.slice(0, -1)}x`), null);
  assert.equal(await decodeSession(Buffer.from(JSON.stringify({ id: "admin", username: "admin", role: "super_admin" })).toString("base64url")), null);
  const expiredContent = Buffer.from(JSON.stringify({ id: "u1", username: "alice", role: "volunteer", exp: 1 })).toString("base64url");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(expiredContent))).toString("base64url");
  assert.equal(await decodeSession(`${expiredContent}.${signature}`), null);
});

test("校内 Cookie 加密保存并拒绝篡改", () => {
  process.env.CCNU_SESSION_KEY = "1".repeat(64);
  const value = encryptCookies("JSESSIONID=example-session");
  assert.ok(!value.includes("example-session"));
  assert.equal(decryptCookies(value), "JSESSIONID=example-session");
  const [iv, tag, data] = value.split(".");
  assert.throws(() => decryptCookies(`${iv}.${tag}.${data[0] === "A" ? "B" : "A"}${data.slice(1)}`));
});

test("求解先补满班次，再均衡人数，同人同日仅一班", async () => {
  const result = await solveRoster(["a", "b"], [
    { key: "1", week: 1, date: "2026-08-31", dayOfWeek: 1, startTime: "08:00", endTime: "09:00", location: "A", requiredCount: 1, eligible: ["a", "b"] },
    { key: "2", week: 1, date: "2026-08-31", dayOfWeek: 1, startTime: "10:00", endTime: "11:00", location: "A", requiredCount: 1, eligible: ["a", "b"] },
    { key: "3", week: 1, date: "2026-09-01", dayOfWeek: 2, startTime: "08:00", endTime: "09:00", location: "A", requiredCount: 1, eligible: ["a", "b"] },
    { key: "4", week: 1, date: "2026-09-02", dayOfWeek: 3, startTime: "08:00", endTime: "09:00", location: "A", requiredCount: 2, eligible: ["a"] }
  ]);
  assert.equal(result["1"].length + result["2"].length, 2);
  assert.notEqual(result["1"][0], result["2"][0]);
  assert.equal(result["4"].length, 1);
  const totals = ["a", "b"].map((id) => Object.values(result).flat().filter((member) => member === id).length);
  assert.ok(Math.abs(totals[0] - totals[1]) <= 1);
});
