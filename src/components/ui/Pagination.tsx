/** 项目导读：通用 UI 组件 Pagination：统一视觉与交互细节；小零件也按规矩来，页面才不会拼成百家被。 */
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  basePath,
  query = {}
}: {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;
  const pages = visiblePages(currentPage, totalPages);

  function href(page: number) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  }

  return (
    <nav aria-label="任务列表分页" className="mt-4 flex flex-col gap-3 border-t border-black/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#86868b]">共 {totalItems} 条，每页 {pageSize} 条 · 第 {currentPage}/{totalPages} 页</p>
      <div className="flex items-center gap-1">
        <PageLink disabled={currentPage <= 1} href={href(currentPage - 1)} label="上一页"><ChevronLeft size={16} /></PageLink>
        {pages.map((page, index) => page === "ellipsis"
          ? <span aria-hidden="true" className="flex size-9 items-center justify-center text-xs text-[#86868b]" key={`ellipsis-${index}`}>…</span>
          : <Link aria-current={page === currentPage ? "page" : undefined} aria-label={`第 ${page} 页`} className={cn(pageButtonClass, page === currentPage ? "bg-[#0071e3] text-white shadow-sm" : "text-[#515154] hover:bg-black/[0.055]")} href={href(page)} key={page} scroll={false}>{page}</Link>)}
        <PageLink disabled={currentPage >= totalPages} href={href(currentPage + 1)} label="下一页"><ChevronRight size={16} /></PageLink>
      </div>
    </nav>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) return <span aria-disabled="true" aria-label={label} className={cn(pageButtonClass, "cursor-not-allowed text-[#c7c7cc]")}>{children}</span>;
  return <Link aria-label={label} className={cn(pageButtonClass, "text-[#515154] hover:bg-black/[0.055]")} href={href} scroll={false}>{children}</Link>;
}

const pageButtonClass = "flex size-9 items-center justify-center rounded-[9px] text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/15";

function visiblePages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis", total];
  if (current >= total - 3) return [1, "ellipsis", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", total];
}
