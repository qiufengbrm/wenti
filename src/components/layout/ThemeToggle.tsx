/** 项目导读：全站布局组件：照看侧栏、顶栏、主题和导航反馈；路标清楚，用户才不用凭感觉回家。 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemePreference = "light" | "dark" | "system";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "浅色", description: "始终使用浅色外观", icon: Sun },
  { value: "dark", label: "深色", description: "始终使用深色外观", icon: Moon },
  { value: "system", label: "跟随系统", description: "自动匹配设备外观", icon: Monitor }
];

export function ThemeToggle() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem("wenti-theme");
    const initial = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    setPreference(initial);
    applyTheme(initial, false);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      if ((window.localStorage.getItem("wenti-theme") || "system") === "system") applyTheme("system", true);
    };
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function chooseTheme(next: ThemePreference) {
    window.localStorage.setItem("wenti-theme", next);
    setPreference(next);
    applyTheme(next, true);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="切换外观模式"
        className={cn("inline-flex size-11 items-center justify-center rounded-[10px] text-[#515154] transition-[background-color,color,transform] hover:bg-black/[0.055] hover:text-[#1d1d1f] sm:size-9", open && "bg-black/[0.055] text-[#1d1d1f]")}
        onClick={() => setOpen((current) => !current)}
        title="外观模式"
        type="button"
      >
        <SunMoon aria-hidden="true" size={19} strokeWidth={1.8} />
      </button>
      {open ? (
        <div className="theme-menu fixed inset-x-3 top-[4.25rem] z-[90] origin-top-right rounded-2xl border border-black/[0.1] bg-white/95 p-2 shadow-floating backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+9px)] sm:w-64" role="menu">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold tracking-[0.02em] text-[#86868b]">外观模式</p>
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const selected = preference === option.value;
            return (
              <button
                aria-checked={selected}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.055]", selected && "bg-[#0071e3]/10")}
                key={option.value}
                onClick={() => chooseTheme(option.value)}
                role="menuitemradio"
                type="button"
              >
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg bg-black/[0.045] text-[#515154]", selected && "bg-[#0071e3]/10 text-[#0066cc]")}><Icon size={16} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#1d1d1f]">{option.label}</span><span className="mt-0.5 block text-[11px] text-[#86868b]">{option.description}</span></span>
                {selected ? <Check className="text-[#0066cc]" size={16} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function applyTheme(preference: ThemePreference, animate: boolean) {
  const root = document.documentElement;
  const dark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (animate) {
    root.classList.add("theme-changing");
    window.setTimeout(() => root.classList.remove("theme-changing"), 220);
  }
  root.dataset.themePreference = preference;
  root.dataset.theme = dark ? "dark" : "light";
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}
