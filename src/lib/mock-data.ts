/** 项目导读：共享工具 mock-data：集中处理跨页面复用的规则；一处写清楚，省得各页面重复发明轮子。 */
import type { Role } from "@/types/role";
import type { CurrentUser, VolunteerUser } from "@/types/user";

export const mockUsers: CurrentUser[] = [
  { id: "u_super", username: "superadmin", password: "123456", name: "超级管理员", role: "super_admin", status: "active", mustChangePassword: true },
  { id: "u_admin_1", username: "admin1", password: "123456", name: "部门负责人测试账号1", role: "admin", status: "active", mustChangePassword: true },
  { id: "u_admin_2", username: "admin2", password: "123456", name: "部门负责人测试账号2", role: "admin", status: "active", mustChangePassword: true },
  { id: "u_volunteer_1", username: "volunteer1", password: "123456", name: "志愿者测试账号1", role: "volunteer", status: "active", mustChangePassword: true },
  { id: "u_volunteer_2", username: "volunteer2", password: "123456", name: "志愿者测试账号2", role: "volunteer", status: "active", mustChangePassword: true }
];

export const volunteers: VolunteerUser[] = [
  {
    id: "u_volunteer_1",
    username: "volunteer1",
    password: "123456",
    name: "志愿者测试账号1",
    role: "volunteer",
    status: "active",
    studentId: "volunteer1",
    grade: "2024级",
    major: "公共管理",
    className: "1班",
    phone: "13800000001"
  },
  {
    id: "u_volunteer_2",
    username: "volunteer2",
    password: "123456",
    name: "志愿者测试账号2",
    role: "volunteer",
    status: "active",
    studentId: "volunteer2",
    grade: "2023级",
    major: "汉语言文学",
    className: "2班",
    phone: "13800000002"
  }
];

export const taskTypes = [
  {
    id: "type_activity",
    name: "活动协助",
    description: "现场签到、秩序维护、物资搬运和流程协助。",
    defaultTemplate: "任务内容：\n1. 提前到场完成签到和物资准备。\n2. 配合现场负责人维护秩序。\n3. 活动结束后协助整理场地。",
    defaultHours: 3,
    isActive: true
  },
  {
    id: "type_photo",
    name: "摄影摄像",
    description: "活动现场照片、短视频素材拍摄与整理。",
    defaultTemplate: "任务内容：\n1. 拍摄活动关键环节。\n2. 活动结束后整理原图和精选图。\n3. 将素材提交给负责人。",
    defaultHours: 2,
    isActive: true
  },
  {
    id: "type_article",
    name: "推文制作",
    description: "活动推文、海报文案和宣传素材整理。",
    defaultTemplate: "任务内容：\n1. 根据活动信息撰写推文初稿。\n2. 整理配图和排版素材。\n3. 按反馈修改并提交最终稿。",
    defaultHours: 2.5,
    isActive: true
  },
  {
    id: "type_archive",
    name: "历史归档任务",
    description: "停用示例类型。",
    defaultTemplate: "该类型已停用。",
    defaultHours: 1,
    isActive: false
  }
];

export const tasks = [
  {
    id: "t1",
    title: "文艺晚会现场协助",
    typeId: "type_activity",
    type: "活动协助",
    description: "协助晚会现场签到、观众引导、道具搬运和结束后的场地整理。",
    startTime: "2026-07-15T18:00",
    endTime: "2026-07-15T21:00",
    deadline: "2026-07-15",
    status: "已发布",
    members: "8/12",
    signupCount: 8,
    maxMembers: 12,
    estimatedHours: 3,
    needProof: true,
    allowCancel: true,
    cancelNeedsReview: true,
    createdBy: "部门负责人测试账号1"
  },
  {
    id: "t2",
    title: "篮球赛秩序维护",
    typeId: "type_activity",
    type: "活动协助",
    description: "负责篮球赛入口秩序、观众座位引导、赛后物资回收。",
    startTime: "2026-07-20T15:00",
    endTime: "2026-07-20T17:00",
    deadline: "2026-07-20",
    status: "人数已满",
    members: "8/8",
    signupCount: 8,
    maxMembers: 8,
    estimatedHours: 2,
    needProof: true,
    allowCancel: false,
    cancelNeedsReview: true,
    createdBy: "部门负责人测试账号1"
  },
  {
    id: "t3",
    title: "活动推文排版",
    typeId: "type_article",
    type: "推文制作",
    description: "根据活动总结材料完成公众号推文排版，并提交预览链接。",
    startTime: "2026-07-22T19:00",
    endTime: "2026-07-22T21:30",
    deadline: "2026-07-22",
    status: "已结束",
    members: "1/2",
    signupCount: 1,
    maxMembers: 2,
    estimatedHours: 2.5,
    needProof: true,
    allowCancel: true,
    cancelNeedsReview: true,
    createdBy: "部门负责人测试账号2"
  }
];

export const taskSignups = [
  {
    id: "su1",
    taskId: "t1",
    userId: "u_volunteer_1",
    user: "志愿者测试账号1",
    studentId: "volunteer1",
    status: "已接取",
    signupAt: "2026-07-04 10:00",
    submittedAt: "-",
    actualHours: "-",
    proofFileName: "-",
    proofDescription: "-",
    cancelReason: "课程临时调课，无法按时到场。",
    cancelRequestedAt: "2026-07-10 12:00",
    cancelStatus: "待审核"
  },
  {
    id: "su2",
    taskId: "t3",
    userId: "u_volunteer_1",
    user: "志愿者测试账号1",
    studentId: "volunteer1",
    status: "待审核",
    signupAt: "2026-07-01 14:10",
    submittedAt: "2026-07-22 22:00",
    actualHours: "2.5",
    proofFileName: "推文预览截图.png",
    proofDescription: "已完成推文排版并提交预览。",
    cancelReason: "-",
    cancelRequestedAt: "-",
    cancelStatus: "-"
  },
  {
    id: "su3",
    taskId: "t2",
    userId: "u_volunteer_2",
    user: "志愿者测试账号2",
    studentId: "volunteer2",
    status: "已通过",
    signupAt: "2026-07-02 09:30",
    submittedAt: "2026-07-20 18:00",
    actualHours: "2",
    proofFileName: "现场照片.jpg",
    proofDescription: "已完成现场秩序维护。",
    cancelReason: "-",
    cancelRequestedAt: "-",
    cancelStatus: "-"
  }
];

export const taskNotifications = [
  {
    id: "tn1",
    receiver: "部门负责人测试账号1",
    title: "新的取消任务申请",
    content: "志愿者测试账号1 申请取消任务「文艺晚会现场协助」，请及时审核。",
    status: "未读",
    date: "2026-07-10 12:00"
  },
  {
    id: "tn2",
    receiver: "部门负责人测试账号2",
    title: "新的任务完成证明待审核",
    content: "志愿者测试账号1 已提交「活动推文排版」完成证明和实际时长 2.5 小时。",
    status: "未读",
    date: "2026-07-22 22:00"
  },
  {
    id: "tn3",
    receiver: "志愿者测试账号2",
    title: "任务志愿时长审核通过",
    content: "你提交的「篮球赛秩序维护」实际时长 2 小时已通过审核。",
    status: "已读",
    date: "2026-07-20 19:00"
  }
];

export const personalMessages = [
  {
    id: "pm1",
    receiverId: "u_admin_1",
    receiver: "部门负责人测试账号1",
    title: "新的取消任务申请",
    content: "志愿者测试账号1 申请取消任务「文艺晚会现场协助」，请及时审核。",
    status: "未读",
    date: "2026-07-10 12:00",
    relatedUrl: "/admin/tasks/t1"
  },
  {
    id: "pm2",
    receiverId: "u_admin_2",
    receiver: "部门负责人测试账号2",
    title: "新的任务完成证明待审核",
    content: "志愿者测试账号1 已提交「活动推文排版」完成证明和实际时长 2.5 小时。",
    status: "未读",
    date: "2026-07-22 22:00",
    relatedUrl: "/admin/tasks/t3"
  },
  {
    id: "pm3",
    receiverId: "u_volunteer_2",
    receiver: "志愿者测试账号2",
    title: "任务志愿时长审核通过",
    content: "你提交的「篮球赛秩序维护」实际时长 2 小时已通过审核。",
    status: "已读",
    date: "2026-07-20 19:00",
    relatedUrl: "/volunteer/tasks/t2"
  },
  {
    id: "pm4",
    receiverId: "u_volunteer_1",
    receiver: "志愿者测试账号1",
    title: "取消申请已提交",
    content: "你的「文艺晚会现场协助」取消申请已提交，等待部门负责人审核。",
    status: "未读",
    date: "2026-07-10 12:01",
    relatedUrl: "/volunteer/tasks/t1"
  }
];

export const files = [
  { id: "f1", title: "活动策划模板", category: "模板", uploader: "文体部门负责人", visibility: "管理员和志愿者", date: "2026-06-18" },
  { id: "f2", title: "场地申请流程", category: "制度", uploader: "系统管理员", visibility: "全体", date: "2026-06-11" }
];

export const tutorials = [
  { id: "tu1", title: "通知发布规范", category: "后台操作", author: "系统管理员", visibility: "管理员", date: "2026-06-21" },
  { id: "tu2", title: "志愿任务反馈填写说明", category: "志愿服务", author: "文体部门负责人", visibility: "全体", date: "2026-06-10" }
];

export const hours = [
  { id: "h1", user: "陈一鸣", activityName: "文艺晚会现场协助", hours: 3.5, status: "已确认", date: "2026-06-23" },
  { id: "h2", user: "林雨晴", activityName: "篮球赛秩序维护", hours: 2, status: "待审核", date: "2026-06-25" }
];

export const operationLogs = [
  { id: "l1", user: "系统管理员", action: "创建账号", targetType: "User", detail: "创建部门负责人账号", date: "2026-07-01 10:30" },
  { id: "l2", user: "文体部门负责人", action: "发布任务", targetType: "Task", detail: "发布文艺晚会现场协助", date: "2026-06-30 15:20" }
];
