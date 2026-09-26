/** 项目导读：工具中心应用启动器；只按注册表展示已实现工具，未来扩容不改页面骨架。 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { tools } from "@/lib/tools";

export function ToolsHome({ basePath }: { basePath: string }) {
  return (
    <>
      <PageHeader description="一些实用的小工具，帮助你更快整理日常工作资料。" title="工具栏" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link className="group rounded-[14px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/20" href={`${basePath}/${tool.slug}`} key={tool.id}>
              <Card className="h-full transition-[transform,border-color,box-shadow] duration-150 group-hover:-translate-y-0.5 group-hover:border-[#0071e3]/25 group-hover:shadow-[0_12px_30px_rgba(0,0,0,.08)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-[12px] bg-[#0071e3]/10 text-[#0071e3]"><Icon size={23} /></span>
                  <span className="grid size-8 place-items-center rounded-full bg-black/[0.035] text-[#86868b] transition-colors group-hover:bg-[#0071e3]/10 group-hover:text-[#0071e3]"><ArrowRight size={16} /></span>
                </div>
                <h2 className="mt-5 text-[17px] font-semibold text-[#1d1d1f]">{tool.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{tool.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
