/** 项目导读：测试数据播种脚本：会重置业务数据，只能招呼全新测试库，生产库看见它要绕道走。 */
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const passwordHash = hashPassword("123456");

async function main() {
  await prisma.message.deleteMany();
  await prisma.noticeRead.deleteMany();
  await prisma.taskSubmission.deleteMany();
  await prisma.taskSignup.deleteMany();
  await prisma.volunteerHour.deleteMany();
  await prisma.operationLog.deleteMany();
  await prisma.fileResource.deleteMany();
  await prisma.resourceFolder.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.tutorial.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskType.deleteMany();
  await prisma.volunteerProfile.deleteMany();
  await prisma.user.deleteMany();

  const superAdmin = await prisma.user.create({
    data: {
      id: "u_super",
      username: "superadmin",
      passwordHash,
      mustChangePassword: true,
      name: "超级管理员",
      role: "SUPER_ADMIN",
      status: "ACTIVE"
    }
  });

  const admin1 = await prisma.user.create({
    data: {
      id: "u_admin_1",
      username: "admin1",
      passwordHash,
      mustChangePassword: true,
      name: "部门负责人测试账号1",
      role: "ADMIN",
      status: "ACTIVE"
    }
  });

  const admin2 = await prisma.user.create({
    data: {
      id: "u_admin_2",
      username: "admin2",
      passwordHash,
      mustChangePassword: true,
      name: "部门负责人测试账号2",
      role: "ADMIN",
      status: "ACTIVE"
    }
  });

  const volunteer1 = await prisma.user.create({
    data: {
      id: "u_volunteer_1",
      username: "volunteer1",
      passwordHash,
      mustChangePassword: true,
      name: "志愿者测试账号1",
      role: "VOLUNTEER",
      status: "ACTIVE",
      studentId: "volunteer1",
      grade: "2024级",
      major: "公共管理",
      className: "1班",
      phone: "13800000001",
      volunteerProfile: {
        create: {
          skills: "现场协助、摄影",
          joinDate: new Date("2026-03-01T00:00:00+08:00"),
          groupName: "活动组",
          tags: "认真,准时",
          status: "ACTIVE"
        }
      }
    }
  });

  const volunteer2 = await prisma.user.create({
    data: {
      id: "u_volunteer_2",
      username: "volunteer2",
      passwordHash,
      mustChangePassword: true,
      name: "志愿者测试账号2",
      role: "VOLUNTEER",
      status: "ACTIVE",
      studentId: "volunteer2",
      grade: "2023级",
      major: "汉语言文学",
      className: "2班",
      phone: "13800000002",
      volunteerProfile: {
        create: {
          skills: "推文制作、物资整理",
          joinDate: new Date("2026-02-20T00:00:00+08:00"),
          groupName: "宣传组",
          tags: "细心,文案",
          status: "ACTIVE"
        }
      }
    }
  });

  const typeData = [
    ["type_activity", "活动协助", "现场签到、秩序维护、物资搬运和流程协助。", "任务内容：\n1. 提前到场完成签到和物资准备。\n2. 配合现场负责人维护秩序。\n3. 活动结束后协助整理场地。", 3],
    ["type_photo", "摄影摄像", "活动现场照片、短视频素材拍摄与整理。", "任务内容：\n1. 拍摄活动关键环节。\n2. 活动结束后整理原图和精选图。\n3. 将素材提交给负责人。", 2],
    ["type_article", "推文制作", "活动推文、海报文案和宣传素材整理。", "任务内容：\n1. 根据活动信息撰写推文初稿。\n2. 整理配图和排版素材。\n3. 按反馈修改并提交最终稿。", 2.5],
    ["type_place", "场地布置", "活动前场地桌椅、展板和物资布置。", "任务内容：\n1. 按图纸布置场地。\n2. 检查物资数量。\n3. 活动后复原场地。", 2],
    ["type_material", "物资整理", "活动物资清点、归档和借还登记。", "任务内容：\n1. 清点物资。\n2. 更新借还记录。\n3. 整理存放区域。", 1.5],
    ["type_sports", "体育赛事协助", "体育赛事签到、计分、秩序与后勤协助。", "任务内容：\n1. 负责选手签到。\n2. 协助现场计分。\n3. 维护观赛秩序。", 2],
    ["type_art", "文艺活动协助", "晚会、演出、展演等文艺活动现场协助。", "任务内容：\n1. 协助演员候场。\n2. 完成道具流转。\n3. 活动结束后整理现场。", 3]
  ];

  await prisma.taskType.createMany({
    data: typeData.map(([id, name, description, defaultTemplate, defaultHours]) => ({
      id,
      name,
      description,
      defaultTemplate,
      defaultHours,
      isActive: true,
      createdById: admin1.id
    }))
  });

  await prisma.task.createMany({
    data: [
      {
        id: "t1",
        title: "校园观影会现场协助",
        typeId: "type_activity",
        description: "协助观影会现场签到、观众引导、道具搬运和结束后的场地整理。",
        startTime: new Date("2026-07-15T18:00:00+08:00"),
        endTime: new Date("2026-07-15T21:00:00+08:00"),
        deadline: new Date("2026-07-15T12:00:00+08:00"),
        status: "PUBLISHED",
        maxMembers: 12,
        estimatedHours: 3,
        needProof: true,
        allowCancel: true,
        cancelNeedsReview: true,
        createdById: admin1.id
      },
      {
        id: "t2",
        title: "体育赛事签到协助",
        typeId: "type_sports",
        description: "负责体育赛事入口签到、观众座位引导、赛后物资回收。",
        startTime: new Date("2026-07-20T15:00:00+08:00"),
        endTime: new Date("2026-07-20T17:00:00+08:00"),
        deadline: new Date("2026-07-20T12:00:00+08:00"),
        status: "FULL",
        maxMembers: 8,
        estimatedHours: 2,
        needProof: true,
        allowCancel: false,
        createdById: admin1.id
      },
      {
        id: "t3",
        title: "活动照片拍摄",
        typeId: "type_photo",
        description: "拍摄活动关键环节，整理原图和精选图后提交给负责人。",
        startTime: new Date("2026-07-22T19:00:00+08:00"),
        endTime: new Date("2026-07-22T21:30:00+08:00"),
        deadline: new Date("2026-07-22T12:00:00+08:00"),
        status: "ENDED",
        maxMembers: 2,
        estimatedHours: 2.5,
        needProof: true,
        allowCancel: true,
        createdById: admin2.id
      },
      {
        id: "t4",
        title: "推文初稿整理",
        typeId: "type_article",
        description: "根据活动总结材料完成公众号推文初稿，并整理配图素材。",
        startTime: new Date("2026-07-25T19:00:00+08:00"),
        endTime: new Date("2026-07-25T21:00:00+08:00"),
        deadline: new Date("2026-07-25T12:00:00+08:00"),
        status: "PUBLISHED",
        maxMembers: 3,
        estimatedHours: 2,
        needProof: true,
        allowCancel: true,
        createdById: admin2.id
      }
    ]
  });

  const signup1 = await prisma.taskSignup.create({
    data: {
      id: "su1",
      taskId: "t1",
      userId: volunteer1.id,
      status: "CANCEL_REQUESTED",
      signupAt: new Date("2026-07-04T10:00:00+08:00"),
      cancelReason: "课程临时调课，无法按时到场。",
      cancelRequestedAt: new Date("2026-07-10T12:00:00+08:00")
    }
  });

  const signup2 = await prisma.taskSignup.create({
    data: {
      id: "su2",
      taskId: "t3",
      userId: volunteer1.id,
      status: "SUBMITTED",
      signupAt: new Date("2026-07-01T14:10:00+08:00")
    }
  });

  const signup3 = await prisma.taskSignup.create({
    data: {
      id: "su3",
      taskId: "t2",
      userId: volunteer2.id,
      status: "APPROVED",
      signupAt: new Date("2026-07-02T09:30:00+08:00")
    }
  });

  await prisma.taskSubmission.createMany({
    data: [
      {
        id: "sub1",
        taskId: "t3",
        signupId: signup2.id,
        userId: volunteer1.id,
        actualHours: 2.5,
        description: "已完成活动照片拍摄并提交精选图。",
        proofFileName: "活动照片精选.zip",
        proofFileType: "application/zip",
        status: "PENDING",
        createdAt: new Date("2026-07-22T22:00:00+08:00")
      },
      {
        id: "sub2",
        taskId: "t2",
        signupId: signup3.id,
        userId: volunteer2.id,
        actualHours: 2,
        description: "已完成现场签到和秩序维护。",
        proofFileName: "现场照片.jpg",
        proofFileType: "image/jpeg",
        status: "APPROVED",
        reviewedById: admin1.id,
        reviewedAt: new Date("2026-07-20T19:00:00+08:00"),
        createdAt: new Date("2026-07-20T18:00:00+08:00")
      }
    ]
  });

  await prisma.volunteerHour.create({
    data: {
      id: "h1",
      userId: volunteer2.id,
      taskId: "t2",
      activityName: "体育赛事签到协助",
      workContent: "入口签到、观众引导、赛后物资回收。",
      hours: 2,
      status: "APPROVED",
      reviewedById: admin1.id,
      createdAt: new Date("2026-07-20T19:00:00+08:00")
    }
  });

  await prisma.notice.createMany({
    data: [
      {
        id: "n1",
        title: "部门例会通知",
        content: "本周部门例会将于周三晚举行，请相关成员准时参加。",
        type: "GENERAL",
        visibility: "ALL",
        isPinned: true,
        createdById: admin1.id,
        createdAt: new Date("2026-07-02T10:00:00+08:00")
      },
      {
        id: "n2",
        title: "活动报名提醒",
        content: "近期活动任务已开放报名，请志愿者按自身时间合理接取。",
        type: "ACTIVITY",
        visibility: "VOLUNTEERS",
        createdById: admin1.id,
        createdAt: new Date("2026-06-28T10:00:00+08:00")
      },
      {
        id: "n3",
        title: "任务提交规范",
        content: "任务完成后请填写实际完成时长并上传必要证明，等待发布任务的部门负责人审核。",
        type: "TASK",
        visibility: "ALL",
        createdById: admin2.id,
        createdAt: new Date("2026-07-01T09:00:00+08:00")
      }
    ]
  });

  await prisma.message.createMany({
    data: [
      {
        id: "pm1",
        receiverId: admin1.id,
        senderId: volunteer1.id,
        title: "新的取消任务申请",
        content: "志愿者测试账号1 申请取消任务「校园观影会现场协助」，请及时审核。",
        category: "APPLICATION",
        status: "UNREAD",
        relatedUrl: "/admin/tasks/t1",
        createdAt: new Date("2026-07-04T12:00:00+08:00")
      },
      {
        id: "pm2",
        receiverId: admin2.id,
        senderId: volunteer1.id,
        title: "新的任务完成证明待审核",
        content: "志愿者测试账号1 已提交「活动照片拍摄」完成证明和实际时长 2.5 小时。",
        category: "APPLICATION",
        status: "UNREAD",
        relatedUrl: "/admin/tasks/t3",
        createdAt: new Date("2026-07-05T10:00:00+08:00")
      },
      {
        id: "pm3",
        receiverId: volunteer2.id,
        senderId: admin1.id,
        title: "任务志愿时长审核通过",
        content: "你提交的「体育赛事签到协助」实际时长 2 小时已通过审核。",
        category: "REPLY",
        status: "READ",
        relatedUrl: "/volunteer/tasks/t2",
        createdAt: new Date("2026-07-05T11:00:00+08:00")
      },
      {
        id: "pm4",
        receiverId: volunteer1.id,
        senderId: admin1.id,
        title: "取消申请已提交",
        content: "你的「校园观影会现场协助」取消申请已提交，等待部门负责人审核。",
        category: "REPLY",
        status: "UNREAD",
        relatedUrl: "/volunteer/tasks/t1",
        createdAt: new Date("2026-07-04T12:01:00+08:00")
      },
      {
        id: "pm5",
        receiverId: volunteer1.id,
        senderId: superAdmin.id,
        title: "系统维护提醒",
        content: "网站将在本周末进行短时维护，如遇短暂无法访问请稍后重试。",
        category: "SYSTEM",
        status: "UNREAD",
        relatedUrl: "/volunteer/messages",
        createdAt: new Date("2026-07-05T09:00:00+08:00")
      }
    ]
  });

  await prisma.fileResource.createMany({
    data: [
      {
        id: "f1",
        title: "活动流程模板",
        category: "模板",
        fileUrl: "/uploads/activity-template.docx",
        fileName: "activity-template.docx",
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        description: "活动策划与执行流程模板。",
        uploadedById: admin1.id,
        visibility: "ALL",
        tags: "模板,活动"
      }
    ]
  });

  await prisma.tutorial.createMany({
    data: [
      {
        id: "tu1",
        title: "通告发布规范",
        content: "发布通告前需确认标题、可见范围和正文内容。",
        category: "后台操作",
        authorId: admin1.id,
        visibility: "ADMINS",
        tags: "后台,通告"
      },
      {
        id: "tu2",
        title: "志愿任务反馈填写说明",
        content: "任务完成后填写实际时长、完成说明，并上传必要证明。",
        category: "志愿服务",
        authorId: admin2.id,
        visibility: "ALL",
        tags: "志愿服务,任务"
      }
    ]
  });

  await prisma.operationLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        action: "初始化系统账号",
        targetType: "User",
        detail: "创建超级管理员、部门负责人和志愿者测试账号。"
      },
      {
        userId: admin1.id,
        action: "发布任务",
        targetType: "Task",
        targetId: "t1",
        detail: "发布校园观影会现场协助任务。"
      }
    ]
  });

  console.log("Seed completed: superadmin/admin1/admin2/volunteer1/volunteer2 password is 123456.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
