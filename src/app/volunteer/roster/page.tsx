import { PageHeader } from "@/components/ui/PageHeader";
import { RosterBoard } from "@/components/roster/RosterBoard";

export default function VolunteerRosterPage() {
  return <><PageHeader title="团队排班" description="查看已发布的全体班次安排。" /><RosterBoard /></>;
}
