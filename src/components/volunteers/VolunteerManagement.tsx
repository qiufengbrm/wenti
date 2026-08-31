/** 项目导读：志愿者管理组件：汇总人员资料和管理入口；名单可以长，操作路径不能绕成九曲黄河。 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, SlidersHorizontal, Sparkles, UserCheck, UserRound, UserX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";

type Volunteer = {
  id: string;
  username: string;
  name: string;
  status: string;
  studentId: string;
  grade: string;
  major: string;
  className: string;
  phone: string;
  skills: string;
  profileComplete: boolean;
};

const statusLabels: Record<string, string> = { active: "正常", pending: "待审核", disabled: "已停用" };

export function VolunteerManagement({ volunteers }: { volunteers: Volunteer[] }) {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return volunteers.filter((volunteer) => {
      const matchesStatus = status === "all" || volunteer.status === status;
      const matchesKeyword = !normalized || [volunteer.name, volunteer.studentId, volunteer.major, volunteer.className, volunteer.phone, volunteer.username, volunteer.skills].some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, status, volunteers]);

  const activeCount = volunteers.filter((item) => item.status === "active").length;
  const pendingCount = volunteers.filter((item) => item.status === "pending").length;
  const incompleteCount = volunteers.filter((item) => !item.profileComplete).length;

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard hint="已录入志愿者账号" label="志愿者总数" value={volunteers.length} />
        <StatCard hint="可正常参与志愿服务" label="正常账号" value={activeCount} />
        <StatCard hint="需要部门负责人确认" label="待审核" value={pendingCount} />
        <StatCard hint="建议提醒补充资料" label="资料待完善" value={incompleteCount} />
      </div>

      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              aria-label="搜索志愿者"
              className="h-10 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索姓名、学号、专业、班级、手机号或特长"
              value={keyword}
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-slate-400" size={17} />
            <select aria-label="按状态筛选" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">全部状态</option>
              <option value="active">正常</option>
              <option value="pending">待审核</option>
              <option value="disabled">已停用</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {filtered.map((volunteer) => <article className="rounded-[14px] border border-black/[0.07] bg-white/90 p-4" key={volunteer.id}>
            <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-600">{volunteer.name.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{volunteer.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{volunteer.studentId} · {volunteer.major} · {volunteer.className}</p></div><StatusBadge status={volunteer.status} /></div>
            <div className="mt-3 flex items-center justify-between rounded-[10px] bg-black/[0.025] px-3 py-2.5 text-xs"><span className={volunteer.profileComplete ? "text-emerald-600" : "text-amber-600"}>{volunteer.profileComplete ? "资料已完善" : "资料待完善"}</span><span className="text-slate-500">{volunteer.phone}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2"><Button className="w-full" href={`/admin/volunteers/${volunteer.id}`} variant="secondary">查看详情</Button><Button className="w-full" href={`/admin/schedules/${volunteer.id}`} variant="ghost">查看课表</Button></div>
          </article>)}
          {filtered.length === 0 ? <div className="py-12 text-center text-slate-500"><UserX className="mx-auto mb-2 text-slate-300" size={30} /><p>没有找到符合条件的志愿者</p><button className="mt-2 min-h-11 text-sm text-blue-600" onClick={() => { setKeyword(""); setStatus("all"); }} type="button">清除筛选</button></div> : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80">
              <tr>{["志愿者", "学籍信息", "联系方式", "资料状态", "账号状态", "操作"].map((label) => <th className="whitespace-nowrap px-5 py-3 text-left font-medium text-slate-500" key={label}>{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((volunteer) => (
                <tr className="transition hover:bg-slate-50/70" key={volunteer.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-600">{volunteer.name.slice(0, 1)}</div>
                      <div><p className="font-medium text-slate-900">{volunteer.name}</p><p className="mt-0.5 text-xs text-slate-400">{volunteer.studentId}</p></div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600"><p>{volunteer.major}</p><p className="mt-0.5 text-xs text-slate-400">{[volunteer.grade, volunteer.className].filter((value) => value !== "-").join(" · ") || "-"}</p></td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{volunteer.phone}</td>
                  <td className="whitespace-nowrap px-5 py-4"><span className={`inline-flex items-center gap-1.5 ${volunteer.profileComplete ? "text-emerald-600" : "text-amber-600"}`}>{volunteer.profileComplete ? <UserCheck size={16} /> : <UserRound size={16} />}{volunteer.profileComplete ? "已完善" : "待完善"}</span></td>
                  <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={volunteer.status} /></td>
                  <td className="whitespace-nowrap px-5 py-4"><div className="flex gap-2"><Button href={`/admin/volunteers/${volunteer.id}`} variant="secondary">查看详情</Button><Button href={`/admin/schedules/${volunteer.id}`} variant="ghost">查看课表</Button></div></td>
                </tr>
              ))}
              {filtered.length === 0 ? <tr><td className="px-5 py-14 text-center text-slate-500" colSpan={6}><UserX className="mx-auto mb-2 text-slate-300" size={30} /><p>没有找到符合条件的志愿者</p><button className="mt-2 text-sm text-blue-600 hover:text-blue-700" onClick={() => { setKeyword(""); setStatus("all"); }} type="button">清除筛选</button></td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">共 {volunteers.length} 名志愿者，当前显示 {filtered.length} 名</div>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "active" ? "green" : status === "pending" ? "amber" : "red";
  return <Badge variant={variant}>{statusLabels[status] ?? status}</Badge>;
}

export type SkillCloudVolunteer = Pick<Volunteer, "id" | "name" | "studentId" | "grade" | "major" | "className" | "skills">;

export function VolunteerSkillCloud({ volunteers, viewer }: { volunteers: SkillCloudVolunteer[]; viewer: "admin" | "volunteer" }) {
  const [selectedSkill, setSelectedSkill] = useState("");
  const skillCloud = useMemo(() => buildSkillCloud(volunteers), [volunteers]);
  const selectedVolunteers = useMemo(
    () => selectedSkill ? volunteers.filter((volunteer) => splitSkills(volunteer.skills).includes(selectedSkill)) : [],
    [selectedSkill, volunteers]
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-50 p-2.5 text-violet-600"><Sparkles size={19} /></div>
          <div>
            <h2 className="font-semibold text-slate-950">志愿者特长云图</h2>
            <p className="mt-1 text-sm text-slate-500">字号越大，拥有这项特长的同学越多；点击词条即可查看他们是谁。</p>
          </div>
        </div>
        {selectedSkill ? <Button onClick={() => setSelectedSkill("")} variant="secondary"><ArrowLeft className="mr-2" size={16} />查看全部</Button> : null}
      </div>
      {selectedSkill ? <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[#0071e3]/[0.065] px-4 py-3 text-sm text-[#0066cc]" aria-live="polite"><span>当前查看：<strong>{selectedSkill}</strong></span><span>{selectedVolunteers.length} 位同学擅长此项</span></div> : null}
      {skillCloud.length > 0 ? <PhysicalSkillCloud onSelect={setSelectedSkill} selectedSkill={selectedSkill} skills={skillCloud} /> : <div className="mt-5 flex min-h-40 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">技能云还在等第一朵云，快去添加一个吧。</div>}
      {selectedSkill ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-950">擅长“{selectedSkill}”的同学</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selectedVolunteers.map((volunteer) => (
              <div className="flex items-center gap-3 rounded-[12px] border border-black/[0.07] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.03)]" key={volunteer.id}>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0071e3]/10 font-semibold text-[#0066cc]">{volunteer.name.slice(0, 1)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-950">{volunteer.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{[volunteer.grade, volunteer.major, volunteer.className].filter((value) => value && value !== "-").join(" · ") || "资料待完善"}</p>
                  {viewer === "admin" ? <p className="mt-0.5 text-xs text-slate-400">学号：{volunteer.studentId}</p> : null}
                </div>
                {viewer === "admin" ? <Button href={`/admin/volunteers/${volunteer.id}`} variant="ghost">详情</Button> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function buildSkillCloud(volunteers: SkillCloudVolunteer[]) {
  return buildSkillCloudValues(volunteers.map((volunteer) => volunteer.skills));
}

function buildSkillCloudValues(skillValues: string[]) {
  const counts = new Map<string, number>();

  skillValues.forEach((skills) => {
    const uniqueSkills = new Set(splitSkills(skills));
    uniqueSkills.forEach((skill) => counts.set(skill, (counts.get(skill) ?? 0) + 1));
  });

  const items = Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"))
    .slice(0, 24);
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return items.map((item) => ({
    ...item,
    fontSize: Math.round(14 + (item.count / maxCount) * 14)
  }));
}

function splitSkills(skills: string) {
  return skills
    .split(/[、,，;；/\n]+/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

type SkillCloudItem = ReturnType<typeof buildSkillCloud>[number];

type PhysicsBody = {
  element: HTMLButtonElement;
  height: number;
  hovered: boolean;
  vx: number;
  vy: number;
  width: number;
  x: number;
  y: number;
};

function PhysicalSkillCloud({ skills, selectedSkill, onSelect }: { skills: SkillCloudItem[]; selectedSkill: string; onSelect: (skill: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const bodiesRef = useRef<PhysicsBody[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const padding = 14;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = skills.map((skill) => itemRefs.current.get(skill.name)).filter((element): element is HTMLButtonElement => Boolean(element));
    const placed: PhysicsBody[] = [];
    let rowX = padding;
    let rowY = padding;
    let rowHeight = 0;

    elements.forEach((element) => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      let x = padding;
      let y = padding;

      if (reducedMotion) {
        if (rowX + width > container.clientWidth - padding) {
          rowX = padding;
          rowY += rowHeight + 10;
          rowHeight = 0;
        }
        x = rowX;
        y = rowY;
        rowX += width + 10;
        rowHeight = Math.max(rowHeight, height);
      } else {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          x = padding + Math.random() * Math.max(1, container.clientWidth - width - padding * 2);
          y = padding + Math.random() * Math.max(1, container.clientHeight - height - padding * 2);
          const overlaps = placed.some((body) => x < body.x + body.width + 8 && x + width + 8 > body.x && y < body.y + body.height + 8 && y + height + 8 > body.y);
          if (!overlaps) break;
        }
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = reducedMotion ? 0 : 75 + Math.random() * 85;
      const body = { element, width, height, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, hovered: false };
      placed.push(body);
      element.style.opacity = "1";
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      element.style.willChange = reducedMotion ? "auto" : "transform";
    });

    bodiesRef.current = placed;
    if (reducedMotion) return;

    let animationFrame = 0;
    let previousTime = performance.now();
    let quietFrames = 0;
    const startedAt = previousTime;

    const tick = (now: number) => {
      const dt = Math.min((now - previousTime) / 1000, 0.032);
      previousTime = now;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const damping = Math.pow(0.982, dt * 60);
      let maximumSpeed = 0;

      placed.forEach((body) => {
        if (body.hovered) {
          body.vx = 0;
          body.vy = 0;
          return;
        }

        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.vx *= damping;
        body.vy *= damping;

        if (body.x < padding) {
          body.x = padding;
          body.vx = Math.abs(body.vx) * 0.78;
        } else if (body.x + body.width > width - padding) {
          body.x = Math.max(padding, width - padding - body.width);
          body.vx = -Math.abs(body.vx) * 0.78;
        }
        if (body.y < padding) {
          body.y = padding;
          body.vy = Math.abs(body.vy) * 0.78;
        } else if (body.y + body.height > height - padding) {
          body.y = Math.max(padding, height - padding - body.height);
          body.vy = -Math.abs(body.vy) * 0.78;
        }
      });

      for (let firstIndex = 0; firstIndex < placed.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < placed.length; secondIndex += 1) {
          resolveCollision(placed[firstIndex], placed[secondIndex]);
        }
      }

      placed.forEach((body) => {
        maximumSpeed = Math.max(maximumSpeed, Math.hypot(body.vx, body.vy));
        body.element.style.transform = `translate3d(${body.x.toFixed(2)}px, ${body.y.toFixed(2)}px, 0)`;
      });

      quietFrames = maximumSpeed < 2 ? quietFrames + 1 : 0;
      if (quietFrames < 24 && now - startedAt < 8000) {
        animationFrame = requestAnimationFrame(tick);
      } else {
        placed.forEach((body) => {
          body.vx = 0;
          body.vy = 0;
          body.element.style.willChange = "auto";
        });
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [skills]);

  function setHovered(skill: string, hovered: boolean) {
    const element = itemRefs.current.get(skill);
    const body = bodiesRef.current.find((item) => item.element === element);
    if (body) body.hovered = hovered;
  }

  return (
    <div
      aria-label="志愿者特长词云，词条正在进行物理碰撞并会自然停止"
      className="relative mt-5 h-[420px] overflow-hidden rounded-[12px] border border-black/[0.06] bg-[#f5f5f7] sm:h-[320px]"
      ref={containerRef}
      role="group"
    >
      {skills.map((skill, index) => {
        const isSelected = selectedSkill === skill.name;
        return (
          <button
            aria-pressed={isSelected}
            className={`absolute left-0 top-0 whitespace-nowrap rounded-full border px-3 py-1.5 font-semibold opacity-0 shadow-[0_1px_3px_rgba(0,0,0,.06)] transition-[background-color,color,border-color,box-shadow,opacity] duration-150 focus:outline-none focus:ring-4 focus:ring-[#0071e3]/20 ${isSelected ? "border-[#0071e3] bg-[#0071e3] text-white hover:bg-[#0077ed]" : index % 3 === 0 ? "border-[#0071e3]/15 bg-white text-[#0066cc] hover:border-[#0071e3]/30 hover:bg-[#0071e3]/10" : index % 3 === 1 ? "border-[#af52de]/15 bg-white text-[#8944ab] hover:border-[#af52de]/30 hover:bg-[#af52de]/10" : "border-black/[0.09] bg-white text-[#515154] hover:border-black/[0.16] hover:bg-black/[0.045]"}`}
            key={skill.name}
            onClick={() => onSelect(skill.name)}
            onPointerEnter={() => setHovered(skill.name, true)}
            onPointerLeave={() => setHovered(skill.name, false)}
            ref={(element) => {
              if (element) itemRefs.current.set(skill.name, element);
              else itemRefs.current.delete(skill.name);
            }}
            style={{ fontSize: `${skill.fontSize}px` }}
            type="button"
          >
            {skill.name}<span className="ml-1 align-super text-[10px] font-normal opacity-70">{skill.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function resolveCollision(first: PhysicsBody, second: PhysicsBody) {
  const overlapX = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
  const overlapY = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);
  if (overlapX <= 0 || overlapY <= 0) return;

  const firstInverseMass = first.hovered ? 0 : 1;
  const secondInverseMass = second.hovered ? 0 : 1;
  const inverseMassSum = firstInverseMass + secondInverseMass;
  if (inverseMassSum === 0) return;

  let normalX = 0;
  let normalY = 0;
  let penetration = 0;
  if (overlapX < overlapY) {
    normalX = first.x + first.width / 2 < second.x + second.width / 2 ? 1 : -1;
    penetration = overlapX;
  } else {
    normalY = first.y + first.height / 2 < second.y + second.height / 2 ? 1 : -1;
    penetration = overlapY;
  }

  const correction = penetration / inverseMassSum;
  first.x -= normalX * correction * firstInverseMass;
  first.y -= normalY * correction * firstInverseMass;
  second.x += normalX * correction * secondInverseMass;
  second.y += normalY * correction * secondInverseMass;

  const relativeVelocity = (second.vx - first.vx) * normalX + (second.vy - first.vy) * normalY;
  if (relativeVelocity >= 0) return;

  const restitution = 0.76;
  const impulse = (-(1 + restitution) * relativeVelocity) / inverseMassSum;
  first.vx -= impulse * normalX * firstInverseMass;
  first.vy -= impulse * normalY * firstInverseMass;
  second.vx += impulse * normalX * secondInverseMass;
  second.vy += impulse * normalY * secondInverseMass;
}
