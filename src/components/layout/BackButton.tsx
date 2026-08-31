/** 项目导读：全站布局组件：照看侧栏、顶栏、主题和导航反馈；路标清楚，用户才不用凭感觉回家。 */
"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function BackButton({ homeHref }: { homeHref: string }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === homeHref) return null;

  function goBack() {
    const continueNavigation = () => {
      if (window.history.length > 1) router.back();
      else router.push(homeHref);
    };
    const navigationEvent = new CustomEvent("app:request-navigation", { cancelable: true, detail: { continueNavigation } });
    if (window.dispatchEvent(navigationEvent)) continueNavigation();
  }

  return (
    <button
      aria-label="返回上一页"
      className="group inline-flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold text-[#515154] transition-[background-color,color,transform] duration-150 hover:bg-black/[0.055] hover:text-[#1d1d1f] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/15 sm:h-9 sm:w-auto sm:px-2.5"
      onClick={goBack}
      type="button"
    >
      <ArrowLeft className="transition-transform duration-150 group-hover:-translate-x-0.5" size={17} />
      <span className="hidden sm:inline">返回</span>
    </button>
  );
}
