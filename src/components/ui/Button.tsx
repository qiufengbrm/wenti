/** 项目导读：通用 UI 组件 Button：统一视觉与交互细节；小零件也按规矩来，页面才不会拼成百家被。 */
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-[#0071e3] text-white shadow-[0_1px_2px_rgba(0,0,0,.08)] hover:bg-[#0077ed]",
  secondary: "bg-black/[0.045] text-[#3a3a3c] ring-1 ring-inset ring-black/[0.06] hover:bg-black/[0.075]",
  ghost: "text-[#515154] hover:bg-black/[0.055] hover:text-[#1d1d1f]",
  danger: "bg-[#ff3b30] text-white shadow-[0_1px_2px_rgba(0,0,0,.08)] hover:bg-[#e6342b]"
};

export function Button({
  href,
  children,
  variant = "primary",
  className,
  onClick,
  type = "button",
  disabled = false,
  download = false
}: {
  href?: string;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  download?: boolean;
}) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[10px] px-4 text-[13px] font-semibold tracking-[-0.005em] transition-[background-color,color,box-shadow,transform] duration-150 ease-apple-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 sm:min-h-9",
    variants[variant],
    disabled ? "cursor-not-allowed opacity-45" : "select-none",
    className
  );

  if (href && !disabled) {
    if (download) {
      return (
        <a className={classes} download href={href}>
          {children}
        </a>
      );
    }
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}
