import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CookieJar } from "tough-cookie";
import { parseCcnuCourses } from "@/lib/ccnu-parser";

const service = "https://bkzhjw.ccnu.edu.cn/jsxsd/framework/xsMainV.htmlx";
const casLogin = `https://account.ccnu.edu.cn/cas/login?service=${encodeURIComponent(service)}`;
const schoolOrigin = "https://bkzhjw.ccnu.edu.cn";
const allowedHosts = new Set(["account.ccnu.edu.cn", "bkzhjw.ccnu.edu.cn"]);
function saveCookies(jar: CookieJar, url: URL, response: Response) {
  for (const line of response.headers.getSetCookie()) {
    jar.setCookieSync(line, url.href, { ignoreError: true });
  }
}

async function request(jar: CookieJar, address: string, init: RequestInit = {}, stopAtTicket = false) {
  let url = new URL(address);
  for (let hop = 0; hop < 8; hop += 1) {
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) throw new Error("校内登录跳转到未允许的地址");
    const headers = new Headers(init.headers);
    headers.set("User-Agent", "Mozilla/5.0");
    headers.set("Cookie", jar.getCookieStringSync(url.href));
    const response = await fetch(url, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(15000), cache: "no-store" });
    saveCookies(jar, url, response);
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, url };
    const location = response.headers.get("location");
    if (!location) throw new Error("校内登录重定向缺少地址");
    url = new URL(location, url);
    if (stopAtTicket && url.searchParams.has("ticket")) return { response, url };
    init = { method: "GET" };
  }
  throw new Error("校内登录重定向次数过多");
}

function formFields(html: string) {
  const fields = new URLSearchParams();
  for (const tag of html.match(/<input\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "";
    if (name) fields.set(name, value.replace(/&amp;/g, "&"));
  }
  return fields;
}

export async function authorizeCcnu(username: string, password: string) {
  const jar = new CookieJar();
  const login = await request(jar, casLogin);
  if (login.url.hostname !== "account.ccnu.edu.cn") throw new Error("校内登录入口未返回认证页面");
  const html = await login.response.text();
  const action = html.match(/<form\b[^>]*\bid=["']fm1["'][^>]*\baction=["']([^"']+)["']/i)?.[1];
  if (!action) throw new Error("校内认证表单已变化，请稍后再试");
  const fields = formFields(html);
  if (!fields.get("lt") || !fields.get("execution")) throw new Error("校内认证页面结构已变化，请稍后再试");
  fields.set("username", username);
  fields.set("password", password);
  fields.set("_eventId", fields.get("_eventId") || "submit");
  fields.set("submit", "LOGIN");
  const submitted = await request(jar, new URL(action.replace(/&amp;/g, "&"), casLogin).toString(), { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: fields }, true);
  const ticket = submitted.url.searchParams.get("ticket");
  if (!ticket) throw new Error("校内账号验证失败，或需先完成校内验证步骤");
  const validation = new URL("https://account.ccnu.edu.cn/cas/serviceValidate");
  validation.searchParams.set("service", service);
  validation.searchParams.set("ticket", ticket);
  const verified = await request(jar, validation.toString());
  const xml = await verified.response.text();
  const studentId = xml.match(/<(?:cas:)?user>([^<]+)<\/(?:cas:)?user>/)?.[1]?.trim();
  if (!studentId || !/^[A-Za-z0-9]+$/.test(studentId)) throw new Error("无法从校内认证结果核对学号");
  const school = await request(jar, casLogin);
  if (school.url.hostname !== "bkzhjw.ccnu.edu.cn") throw new Error("无法进入本科智慧教务");
  const cookies = jar.getCookieStringSync(`${schoolOrigin}/jsxsd/xskb/xskb_list.do`);
  if (!cookies) throw new Error("智慧教务未提供有效会话");
  return { studentId, cookies };
}

export async function fetchCcnuSchedule(cookies: string, term: string) {
  if (!/^\d{4}-\d{4}-[12]$/.test(term)) throw new Error("学期格式应为 2026-2027-1");
  const url = new URL("/jsxsd/xskb/xskb_list.do", schoolOrigin);
  Object.entries({ viweType: "1", needData: "1", pageNum: "1", pageSize: "84", demoStr: "", baseUrl: "/jsxsd", sfykb: "2", xsflMapListJsonStr: "授课,实验(实践),课外,实习,研讨,", xnxq01id: term, zc: "", kbjcmsid: "16FD8C2BE55E15F9E0630100007FF6B5" }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers: { Cookie: cookies, "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0", Referer: `${schoolOrigin}/jsxsd/` }, redirect: "manual", signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!response.ok) {
    const redirect = response.headers.get("location");
    const destination = redirect ? new URL(redirect, url) : null;
    throw new Error(`智慧教务课表响应异常（HTTP ${response.status}，${response.headers.get("content-type") ?? "无类型"}${destination ? `，跳转至 ${destination.hostname}${destination.pathname}` : ""}）`);
  }
  const body = await response.text();
  let payload: unknown;
  try { payload = JSON.parse(body); }
  catch { throw new Error(`智慧教务返回了${/^\s*</.test(body) ? "登录页面" : "非 JSON 内容"}（HTTP ${response.status}），请重新授权`); }
  return parseCcnuCourses(payload);
}

function key() {
  const hex = process.env.CCNU_SESSION_KEY ?? "";
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) throw new Error("CCNU_SESSION_KEY must be 64 hex characters");
  return Buffer.from(hex, "hex");
}

export function encryptCookies(cookies: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(cookies, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}

export function decryptCookies(value: string): string {
  const [iv, tag, data] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
