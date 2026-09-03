# 文艺体育中心志愿服务管理系统

面向高校文艺体育中心的志愿服务管理平台，覆盖志愿者、部门负责人和超级管理员三类用户。

## 主要功能

- 志愿者资料与账号管理
- 志愿时长申报、审核与 Excel 导出
- 课表导入、查看与空闲时间查询
- 教程发布、消息通知与特长词云
- 活动资料、文件夹及文件管理
- 桌面端、移动端和深色模式适配

## 技术栈

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Prisma · MySQL

## 本地运行

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。运行前请先在 `.env` 中配置 MySQL 与文件存储路径。

## 文档

- [完整项目说明](./README_FULL.md)
- [生产部署手册](./README_DEPLOY.md)

> 请勿提交 `.env*`、数据库备份、上传文件、`node_modules` 或 `.next`。
