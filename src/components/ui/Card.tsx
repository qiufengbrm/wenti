/** 项目导读：通用 UI 组件 Card：统一视觉与交互细节；小零件也按规矩来，页面才不会拼成百家被。 */
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const cardClass = "rounded-[14px] border border-black/[0.08] bg-white/90 p-4 shadow-soft backdrop-blur-xl sm:p-6";

export function Card({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn(cardClass, className)}>{children}</section>;
}

export function StatCard({
  label,
  value,
  href
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="pr-6 text-sm font-semibold leading-5 tracking-[-0.01em] text-[#6e6e73] sm:pr-8 sm:text-base sm:leading-6">{label}</p>
      <p className="mt-2 text-[1.7rem] font-semibold leading-none tracking-[-0.035em] text-[#1d1d1f] sm:text-[2rem]">{value}</p>
      {href ? <span aria-hidden="true" className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-black/[0.035] text-[#86868b] transition-[transform,background-color,color] duration-150 group-hover:translate-x-0.5 group-hover:bg-[#0071e3]/10 group-hover:text-[#0071e3] sm:right-5 sm:top-5"><ChevronRight size={15} /></span> : null}
    </>
  );

  if (href) {
    return <Link aria-label={`${label}：${value}，进入查看`} className={cn(cardClass, "group relative block cursor-pointer pr-12 transition-[transform,box-shadow,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-[#0071e3]/20 hover:bg-white hover:shadow-[0_10px_28px_rgba(0,0,0,.08)] active:translate-y-0 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/18")} href={href}>{content}</Link>;
  }

  return <Card>{content}</Card>;
}
