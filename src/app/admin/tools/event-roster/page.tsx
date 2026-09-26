/** 项目导读：管理员赛事排班表生成器入口；复杂交互由共享组件承接。 */
import { EventRosterBuilder } from "@/components/tools/event-roster/EventRosterBuilder";

export default function AdminEventRosterPage() {
  return <EventRosterBuilder backHref="/admin/tools" />;
}
