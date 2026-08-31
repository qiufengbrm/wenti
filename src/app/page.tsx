/** 项目导读：页面入口 page.tsx：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDefaultRouteByRole } from "@/lib/permissions";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultRouteByRole(user.role));
  }

  redirect("/login");
}
