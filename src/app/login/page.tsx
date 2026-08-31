/** 项目导读：页面入口 login：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f5f5f7] px-5 py-12">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <Card className="w-full max-w-3xl p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-[12px] bg-[#0071e3] text-lg font-semibold text-white shadow-sm">文</span>
        <p className="mt-5 text-[13px] font-semibold text-[#0066cc]">文艺体育中心</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.035em] text-[#1d1d1f]">请选择登录入口</h1>
        <p className="mt-2 text-[13px] leading-6 text-[#6e6e73]">管理员和志愿者使用不同网址登录。</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-[12px] border border-black/[0.08] bg-black/[0.02] p-5">
            <h2 className="text-base font-semibold text-[#1d1d1f]">志愿者入口</h2>
            <p className="mt-2 text-[13px] text-[#6e6e73]">普通志愿者登录个人工作台。</p>
            <Button className="mt-5 w-full" href="/volunteer/login">
              志愿者登录
            </Button>
          </section>
          <section className="rounded-[12px] border border-black/[0.08] bg-black/[0.02] p-5">
            <h2 className="text-base font-semibold text-[#1d1d1f]">管理员入口</h2>
            <p className="mt-2 text-[13px] text-[#6e6e73]">部门负责人登录管理后台。</p>
            <Button className="mt-5 w-full" href="/admin/login" variant="secondary">
              管理员登录
            </Button>
          </section>
        </div>
      </Card>
    </main>
  );
}
