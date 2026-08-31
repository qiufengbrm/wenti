/** 项目导读：页面入口 admin → files：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { ResourceDrive } from "@/components/files/ResourceDrive";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AdminFilesPage() {
  return (
    <>
      <PageHeader description="按活动项目组织文件，创建项目并与全体成员协作整理资料。" title="资料中心" />
      <ResourceDrive isAdmin />
    </>
  );
}
