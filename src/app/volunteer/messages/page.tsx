/** 项目导读：页面入口 volunteer → messages：负责取数和组装界面，重活尽量交给组件，别让页面一人包办全村席面。 */
import { MessageCenter } from "@/components/messages/MessageCenter";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireVolunteer } from "@/lib/auth";
import { getMessageCenterData } from "@/lib/data";

export default async function VolunteerMessagesPage() {
  const user = await requireVolunteer();
  const threads = await getMessageCenterData(user.id);

  return (
    <>
      <PageHeader description="查看任务申请、审核回复和系统消息。" title="我的消息" />
      <MessageCenter initialThreads={threads} role={user.role} />
    </>
  );
}
