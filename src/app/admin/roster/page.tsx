import { PageHeader } from "@/components/ui/PageHeader";
import { RosterBoard } from "@/components/roster/RosterBoard";

export default function AdminRosterPage() {
  return <><PageHeader title="自动排班" description="设置教学周、固定班次和候选成员，生成草稿后核对并发布。" /><RosterBoard admin /></>;
}
