/** 项目导读：通用 UI 组件 PageHeader：统一视觉与交互细节；小零件也按规矩来，页面才不会拼成百家被。 */
import { Button } from "@/components/ui/Button";

export function PageHeader({
  title,
  description,
  actionHref,
  actionLabel
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="max-w-3xl">
        <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[#1d1d1f] sm:text-[2rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#6e6e73]">{description}</p> : null}
      </div>
      {actionHref && actionLabel ? <Button className="w-full sm:w-auto" href={actionHref}>{actionLabel}</Button> : null}
    </div>
  );
}
