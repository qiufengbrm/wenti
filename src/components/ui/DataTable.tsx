/** 项目导读：通用 UI 组件 DataTable：统一视觉与交互细节；小零件也按规矩来，页面才不会拼成百家被。 */
import { Badge } from "@/components/ui/Badge";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export function DataTable<T extends object>({
  columns,
  data,
  emptyText = "暂无数据",
  mobileRender
}: {
  columns: Array<Column<T>>;
  data: T[];
  emptyText?: string;
  mobileRender?: (row: T) => React.ReactNode;
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {data.length > 0 ? data.map((row, index) => (
          <article className="overflow-hidden rounded-[14px] border border-black/[0.08] bg-white/90 shadow-soft" key={String((row as { id?: string }).id ?? index)}>
            {mobileRender ? <div className="px-4 py-3">{mobileRender(row)}</div> : <dl className="divide-y divide-black/[0.06]">
              {columns.map((column, columnIndex) => (
                <div className={`grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 px-4 py-3 ${columnIndex === 0 ? "bg-black/[0.018]" : ""}`} key={String(column.key)}>
                  <dt className="text-xs font-medium leading-5 text-[#86868b]">{column.header}</dt>
                  <dd className="min-w-0 break-words text-right text-sm font-medium leading-5 text-[#3a3a3c]">{column.render ? column.render(row) : renderCell((row as Record<string, unknown>)[String(column.key)])}</dd>
                </div>
              ))}
            </dl>}
          </article>
        )) : <div className="rounded-[14px] border border-black/[0.08] bg-white/70 px-4 py-10 text-center text-sm text-slate-500">{emptyText}</div>}
      </div>
      <div className="hidden overflow-x-auto rounded-[12px] border border-black/[0.08] bg-white/70 md:block">
      <table className="min-w-full divide-y divide-black/[0.07] text-[13px]">
        <thead className="bg-black/[0.025]">
          <tr>
            {columns.map((column) => (
              <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold text-[#6e6e73]" key={String(column.key)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.055]">
          {data.length > 0 ? (
            data.map((row, index) => (
              <tr className="transition-colors duration-150 hover:bg-[#0071e3]/[0.035]" key={String((row as { id?: string }).id ?? index)}>
                {columns.map((column) => (
                  <td className="px-4 py-3.5 leading-5 text-[#3a3a3c]" key={String(column.key)}>
                    {column.render ? column.render(row) : renderCell((row as Record<string, unknown>)[String(column.key)])}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </>
  );
}

function renderCell(value: unknown) {
  if (typeof value === "string" && ["已发布", "置顶", "已确认", "报名中", "待反馈", "已接取", "已通过", "启用", "已读"].includes(value)) {
    return <Badge variant="blue">{value}</Badge>;
  }

  if (typeof value === "string" && ["待审核", "待处理", "待确认", "人数已满", "未读", "可申请", "pending"].includes(value)) {
    return <Badge variant="amber">{value === "pending" ? "待审核" : value}</Badge>;
  }

  if (typeof value === "string" && ["disabled", "已驳回", "停用"].includes(value)) {
    return <Badge variant="red">{value === "disabled" ? "已禁用" : value}</Badge>;
  }

  if (typeof value === "string" && ["active", "已结束"].includes(value)) {
    return <Badge variant="green">{value === "active" ? "正常" : value}</Badge>;
  }

  return String(value ?? "-");
}
