/** 项目导读：志愿者赛事排班表生成器入口；复杂交互由共享组件承接。 */
import { EventRosterBuilder } from "@/components/tools/event-roster/EventRosterBuilder";

export default function VolunteerEventRosterPage() {
  return <EventRosterBuilder backHref="/volunteer/tools" />;
}
