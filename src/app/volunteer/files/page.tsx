/** 项目导读：页面入口 volunteer → files：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { ResourceDrive } from "@/components/files/ResourceDrive";
import { PageHeader } from "@/components/ui/PageHeader";

export default function VolunteerFilesPage() {
  return (
    <>
      <PageHeader description="进入活动项目，上传文件、新建文件夹并共同整理资料。" title="资料中心" />
      <ResourceDrive />
    </>
  );
}
