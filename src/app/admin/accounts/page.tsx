/** 项目导读：页面入口 admin → accounts：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountCreateForm } from "@/components/accounts/AccountCreateForm";
import { AccountDeleteButton } from "@/components/accounts/AccountDeleteButton";
import { requireSuperAdmin } from "@/lib/auth";
import { getAccounts } from "@/lib/data";
import { roleLabels, type Role } from "@/types/role";

export default async function AdminAccountsPage() {
  await requireSuperAdmin();
  const accounts = await getAccounts();

  return (
    <>
      <PageHeader description="仅超级管理员可见。用于创建、删除账号，并为管理员和志愿者重置初始密码。" title="账号管理" />
      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">创建账号</h2>
          <p className="mt-2 text-sm text-slate-500">超级管理员创建部门负责人或志愿者账号，并分配初始密码。</p>
          <AccountCreateForm />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">账号规则</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <p>超级管理员可以创建部门负责人和普通志愿者账号。</p>
            <p>超级管理员账号不在普通创建表单中创建，避免误操作。</p>
            <p>重置密码后，账号会回到初始密码状态，用户后续可自行修改密码。</p>
            <p>创建后的账号立即启用，并保留“初始密码”状态，提醒用户首次登录后自行修改。</p>
            <p>删除时可选择保留历史关联信息，或永久清理个人报名、时长、消息、证明附件和本人上传文件。</p>
            <p>永久删除需要输入用户名二次确认；已有参与者的共享业务内容会转交当前超级管理员。</p>
          </div>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-950">全部账号</h2>
        <DataTable
          columns={[
            { key: "username", header: "用户名" },
            { key: "name", header: "姓名" },
            { key: "role", header: "角色", render: (row) => roleLabels[row.role as Role] },
            { key: "status", header: "状态" },
            {
              key: "password",
              header: "密码状态",
              render: (row) => (row.mustChangePassword ? <Badge variant="amber">初始密码</Badge> : <Badge variant="green">已修改</Badge>)
            },
            {
              key: "actions",
              header: "操作",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50" type="button">
                    重置密码
                  </button>
                  <button className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50" type="button">
                    {row.status === "disabled" ? "启用" : "禁用"}
                  </button>
                  <AccountDeleteButton disabled={row.role === "super_admin"} id={String(row.id)} name={String(row.name)} username={String(row.username)} />
                </div>
              )
            }
          ]}
          data={accounts}
        />
      </Card>
    </>
  );
}
