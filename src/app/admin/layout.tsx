/** 项目导读：页面布局：统一导航、主题和内容骨架；架子搭稳了，里面的页面才不会各走各的。 */
import { AdminLayout } from "@/components/layout/AdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
