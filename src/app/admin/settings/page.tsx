/** 项目导读：页面入口 admin → settings：超级管理员在这里掌总开关，维护前先敲锣，大家收工才不慌。 */
import { SiteAnnouncementSettings } from "@/components/settings/SiteAnnouncementSettings";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFloatingAnnouncement } from "@/lib/floating-announcement";
import { requireSuperAdmin } from "@/lib/auth";

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const announcement = await getFloatingAnnouncement();

  return (
    <>
      <PageHeader description="仅超级管理员可见。维护前可在这里向全站悬浮发布临时公告。" title="系统设置" />
      <SiteAnnouncementSettings initialAnnouncement={announcement} />
    </>
  );
}
