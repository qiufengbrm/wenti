/** 项目导读：业务表单组件：收集输入并给出明确反馈；提交按钮不是许愿池，校验还是要认真做。 */
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function FormShell({
  fields,
  submitLabel = "保存草稿"
}: {
  fields: Array<{ label: string; name: string; type?: "text" | "textarea" | "date" | "number" | "select" }>;
  submitLabel?: string;
}) {
  return (
    <Card>
      <form className="grid gap-6">
        {fields.map((field) => (
          <label className="grid gap-2 text-[13px] font-semibold text-[#3a3a3c]" key={field.name}>
            {field.label}
            {field.type === "textarea" ? (
              <textarea className="min-h-28 border px-3.5 py-3 outline-none" />
            ) : field.type === "select" ? (
              <select className="h-10 border px-3 outline-none">
                <option>请选择</option>
                <option>全体可见</option>
                <option>仅管理员</option>
                <option>仅志愿者</option>
              </select>
            ) : (
              <input
                className="h-10 border px-3 outline-none"
                type={field.type ?? "text"}
              />
            )}
          </label>
        ))}
        <div className="flex flex-col-reverse gap-2 border-t border-black/[0.07] pt-5 sm:flex-row sm:justify-end">
          <Button variant="secondary">取消</Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
