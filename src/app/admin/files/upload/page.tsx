/** 项目导读：页面入口 admin → files → upload：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { redirect } from "next/navigation";

export default function AdminUploadFilePage() {
  redirect("/admin/files");
}
