/** 项目导读：全站布局组件：照看侧栏、顶栏、主题和导航反馈；路标清楚，用户才不用凭感觉回家。 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  ChevronDown,
  EyeOff,
  FilePlus2,
  FileText,
  Gauge,
  History,
  Settings,
  Sparkles,
  UploadCloud,
  User,
  UserCog,
  Users,
  Menu,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const icons = {
  bookOpen: BookOpen,
  calendar: CalendarDays,
  clipboardList: ClipboardList,
  fileText: FileText,
  filePlus: FilePlus2,
  gauge: Gauge,
  history: History,
  settings: Settings,
  sparkles: Sparkles,
  uploadCloud: UploadCloud,
  user: User,
  userCog: UserCog,
  users: Users
};

export type NavIcon = keyof typeof icons;

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  hidden?: boolean;
  last?: boolean;
  exact?: boolean;
}

export function Sidebar({
  title,
  items
}: {
  title: string;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => !item.hidden && !item.last);
  const hiddenItems = items.filter((item) => item.hidden);
  const lastItems = items.filter((item) => !item.hidden && item.last);
  const [hiddenOpen, setHiddenOpen] = useState(() => hiddenItems.some((item) => isActive(item, pathname)));

  return (
    <aside className="apple-material fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r border-black/[0.07] lg:block">
      <div className="flex h-16 items-center px-5">
        <Link className="flex items-center gap-3 text-[15px] font-semibold tracking-[-0.015em] text-[#1d1d1f]" href="/">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-[9px] bg-[#0071e3] text-sm font-bold text-white shadow-sm">文</span>
          {title}
        </Link>
      </div>
      <nav className="grid gap-0.5 px-3 pb-5 pt-2">
        {visibleItems.map((item) => <NavLink item={item} key={item.href} pathname={pathname} />)}
        {hiddenItems.length > 0 ? (
          <div className="mt-3 border-t border-black/[0.07] pt-3">
            <button
              aria-expanded={hiddenOpen}
              className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium text-[#6e6e73] transition-colors duration-150 hover:bg-black/[0.05] hover:text-[#1d1d1f]"
              onClick={() => setHiddenOpen((value) => !value)}
              type="button"
            >
              <EyeOff size={18} />
              <span className="flex-1 text-left">隐藏</span>
              <ChevronDown className={cn("transition-transform duration-300 ease-apple-out", hiddenOpen && "rotate-180")} size={15} />
            </button>
            <div aria-hidden={!hiddenOpen} className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-apple-out", hiddenOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0")} inert={!hiddenOpen ? true : undefined}>
              <div className="overflow-hidden">
                <div className="mt-1 grid gap-0.5 border-l border-[#ff9f0a]/30 pl-2">
                  <p className="px-3 py-2 text-[11px] font-medium leading-5 text-[#a05a00]">功能正在完善中</p>
                  {hiddenItems.map((item) => <NavLink item={item} key={item.href} pathname={pathname} />)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {lastItems.length > 0 ? <div className="mt-3 grid gap-0.5 border-t border-black/[0.07] pt-3">{lastItems.map((item) => <NavLink item={item} key={item.href} pathname={pathname} />)}</div> : null}
      </nav>
    </aside>
  );
}

export function MobileNav({ title, items }: { title: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const visibleItems = items.filter((item) => !item.hidden && !item.last);
  const hiddenItems = items.filter((item) => item.hidden);
  const lastItems = items.filter((item) => !item.hidden && item.last);
  const [hiddenOpen, setHiddenOpen] = useState(() => hiddenItems.some((item) => isActive(item, pathname)));

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button aria-label="打开导航菜单" className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[#515154] hover:bg-black/[0.055] lg:hidden" onClick={() => setOpen(true)}>
        <Menu size={21} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="关闭导航遮罩" className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" onClick={() => setOpen(false)} />
          <aside className="mobile-nav-sheet relative min-h-screen w-[20rem] max-w-[88vw] overflow-hidden border-r border-white/70 shadow-floating" style={{ height: "100dvh" }}>
            <div aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: "var(--app-surface-solid)" }} />
            <div className="relative z-10 flex h-16 items-center justify-between px-4">
              <span className="font-semibold tracking-[-0.015em] text-[#1d1d1f]">{title}</span>
              <button aria-label="关闭导航菜单" className="grid size-11 place-items-center rounded-[10px] text-[#6e6e73] hover:bg-black/[0.055]" onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <nav className="relative z-10 grid max-h-[calc(100dvh-4rem)] gap-1 overflow-y-auto px-3 pb-6 pt-2">
              {visibleItems.map((item) => <NavLink item={item} key={item.href} mobile onNavigate={() => setOpen(false)} pathname={pathname} />)}
              {hiddenItems.length > 0 ? (
                <div className="mt-3 border-t border-black/[0.07] pt-3">
                  <button aria-expanded={hiddenOpen} className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium text-[#6e6e73] hover:bg-black/[0.05]" onClick={() => setHiddenOpen((value) => !value)} type="button">
                    <EyeOff size={18} /><span className="flex-1 text-left">隐藏</span><ChevronDown className={cn("transition-transform duration-200", hiddenOpen && "rotate-180")} size={16} />
                  </button>
                  <div aria-hidden={!hiddenOpen} className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-apple-out", hiddenOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0")} inert={!hiddenOpen ? true : undefined}><div className="overflow-hidden"><div className="mt-1 grid gap-0.5 border-l border-[#ff9f0a]/30 pl-2"><p className="px-3 py-2 text-[11px] font-medium leading-5 text-[#a05a00]">功能正在完善中</p>{hiddenItems.map((item) => <NavLink item={item} key={item.href} mobile onNavigate={() => setOpen(false)} pathname={pathname} />)}</div></div></div>
                </div>
              ) : null}
              {lastItems.length > 0 ? <div className="mt-3 grid gap-1 border-t border-black/[0.07] pt-3">{lastItems.map((item) => <NavLink item={item} key={item.href} mobile onNavigate={() => setOpen(false)} pathname={pathname} />)}</div> : null}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function NavLink({ item, pathname, mobile = false, onNavigate }: { item: NavItem; pathname: string; mobile?: boolean; onNavigate?: () => void }) {
  const Icon = icons[item.icon];
  const active = isActive(item, pathname);
  return (
    <Link
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium text-[#515154] transition-[background-color,color,transform] duration-150 ease-apple-out hover:bg-black/[0.05] hover:text-[#1d1d1f]",
        mobile ? "h-12 text-[14px]" : "h-10",
        active && "bg-[#0071e3]/10 font-semibold text-[#0066cc]"
      )}
      href={item.href}
      onClick={onNavigate}
    >
      <Icon size={18} />{item.label}
    </Link>
  );
}

function isActive(item: NavItem, pathname: string) {
  return pathname === item.href || (!item.exact && item.href !== "/admin" && item.href !== "/volunteer" && pathname.startsWith(`${item.href}/`));
}
