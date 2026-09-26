/** 项目导读：工具中心注册表；新增工具先在这里登记，首页便不必再手砌一张卡。 */
import { CalendarClock } from "lucide-react";

export const tools = [
  {
    id: "event-roster",
    name: "赛事排班表生成器",
    description: "从 PDF、截图等赛事材料中提取比赛时间，并生成可填写的赛事跟进表。",
    icon: CalendarClock,
    slug: "event-roster"
  }
] as const;
