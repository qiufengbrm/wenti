/** 项目导读：通用 UI 组件 Badge：统一视觉与交互细节；小零件也按规矩来，页面才不会拼成百家被。 */
import { cn } from "@/lib/utils";

const variants = {
  blue: "bg-[#0071e3]/10 text-[#0066cc] ring-[#0071e3]/10",
  green: "bg-[#34c759]/12 text-[#248a3d] ring-[#34c759]/10",
  gray: "bg-black/[0.055] text-[#515154] ring-black/[0.055]",
  amber: "bg-[#ff9f0a]/12 text-[#a05a00] ring-[#ff9f0a]/10",
  red: "bg-[#ff3b30]/10 text-[#d70015] ring-[#ff3b30]/10"
};

export function Badge({
  children,
  variant = "gray"
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] ring-1 ring-inset", variants[variant])}>
      {children}
    </span>
  );
}
