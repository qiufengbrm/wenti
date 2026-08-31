/** 项目导读：页面布局：统一导航、主题和内容骨架；架子搭稳了，里面的页面才不会各走各的。 */
import { VolunteerLayout } from "@/components/layout/VolunteerLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <VolunteerLayout>{children}</VolunteerLayout>;
}
