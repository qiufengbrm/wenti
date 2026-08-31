/** 项目导读：全站悬浮公告总闸门：只认一条当前公告，避免维护通知在数据库里开成早市。 */
import { prisma } from "@/lib/db";

export type FloatingAnnouncementData = {
  content: string;
  enabled: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
};

const defaultAnnouncement: FloatingAnnouncementData = {
  content: "网站即将进行短暂维护，请及时保存正在填写的内容。",
  enabled: false,
  updatedAt: null,
  updatedByName: null
};

export async function getFloatingAnnouncement(): Promise<FloatingAnnouncementData> {
  const announcement = await prisma.floatingAnnouncement.findUnique({ where: { id: 1 } });
  if (!announcement) return defaultAnnouncement;

  return {
    content: announcement.content,
    enabled: announcement.isEnabled,
    updatedAt: announcement.updatedAt.toISOString(),
    updatedByName: announcement.updatedByName
  };
}
