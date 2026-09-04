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

## 更新生产服务器

本地修改完成后先提交并推送：

```bash
git status
npm run build
git add <本次改动文件>
git commit -m "说明本次改动"
git push origin main
```

服务器在 `/opt/wenti` 拉取、构建、重启并验证：

```bash
cd /opt/wenti
sudo -u wenti git fetch origin
sudo -u wenti git status -sb
sudo systemctl stop wenti
sudo -u wenti git pull --ff-only origin main
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npx prisma migrate deploy
sudo -u wenti npm run build
sudo systemctl start wenti
sudo systemctl status wenti --no-pager
curl -I http://127.0.0.1:3000
```

完整更新、验证和回滚步骤见 [生产部署手册](./README_DEPLOY.md#16-更新与回滚)。

> 请勿提交 `.env*`、数据库备份、上传文件、`node_modules` 或 `.next`。
