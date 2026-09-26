/** 项目导读：页面入口 admin → settings：超级管理员在这里掌总开关，维护前先敲锣，大家收工才不慌。 */
import { SiteAnnouncementSettings } from "@/components/settings/SiteAnnouncementSettings";
import { AiProviderSettings } from "@/components/settings/AiProviderSettings";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAiProviderStatus } from "@/lib/ai-provider-settings";
import { getFloatingAnnouncement } from "@/lib/floating-announcement";
import { requireSuperAdmin } from "@/lib/auth";

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const [announcement, aiStatus] = await Promise.all([getFloatingAnnouncement(), getAiProviderStatus()]);

  return (
    <>
      <PageHeader description="仅超级管理员可见。统一维护全站公告与共享服务配置。" title="系统设置" />
      <div className="grid gap-5">
        <AiProviderSettings initialStatus={aiStatus} />
        <SiteAnnouncementSettings initialAnnouncement={announcement} />
      </div>
    </>
  );
}
