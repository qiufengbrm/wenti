# 文艺体育中心志愿服务管理系统

面向文艺体育中心的志愿服务管理网站，包含超级管理员、部门负责人和志愿者三类用户。系统基于 Next.js App Router、TypeScript、Tailwind CSS、Prisma 与 MySQL 构建，支持志愿者资料、志愿时长审核与导出、课表录入与空闲查询、特长词云、教程、消息和活动资料库等功能，并完整适配桌面端、深色模式和手机端。

> 部署前请先阅读本文的“生产环境安全检查”。当前登录会话实现适合内网测试，但在直接开放到公网前必须加固。

需要交给另一台服务器上的 AI 或运维人员快速部署时，请直接使用独立的 [README_DEPLOY.md](./README_DEPLOY.md)。该文档包含分阶段命令、禁止事项、迁移/新建两种路径、systemd、Nginx、HTTPS、验收和回滚流程。

## README 同步维护规则

**每次修改项目内容后，都必须在同一轮修改中同步检查并更新本 README。** 不允许只修改代码、数据库或部署配置而保留过期文档。

需要同步更新 README 的情况包括但不限于：

- 新增、删除或调整页面、功能、角色权限和业务流程
- 修改用户可见的名称、入口、操作步骤或限制条件
- 新增、删除或升级 npm 依赖和系统依赖
- 修改环境变量、端口、文件存储目录或上传限制
- 修改 Prisma 数据模型、数据库迁移、种子数据或备份方式
- 修改构建命令、启动命令、systemd、Nginx 或 HTTPS 配置
- 修改项目目录结构、服务器迁移步骤或生产安全要求

每次提交或部署前应确认：README 描述与当前代码一致，命令经过核对，旧说明已被删除或修正。本规则本身也应随项目维护要求变化而更新。

## 代码注释约定

- 源码文件顶部使用一条“项目导读”概括职责，方便接手者先看地图再进村。
- 只在权限边界、状态事务、文件落盘、格式解析和复杂交互等不直观位置补行内注释，不复述一眼就能看懂的代码。
- 注释允许带一点中式幽默，但必须先准确、后好笑；业务规则变化时同步更新，过期段子和过期文档一样都要清理。
- `prisma/migrations/` 中已经生成的历史 SQL 不添加注释、不做格式化，避免改变迁移校验值；数据库说明统一写在当前 `schema.prisma` 和部署文档中。

## 主要功能

### 志愿者端

- 从独立入口登录，在首页进入个人待办、志愿时长和教程等对应页面。
- 通过侧栏独立的“申请志愿时长”填写服务内容、日期、可选开始/结束时间、申报时长、备注和辅助证明；不再使用结束日期字段。
- 证明材料支持点击或拖拽上传，单个最大 20 MB。上传图片会转为最长边不超过 1920×1080 的 JPG；PDF、Office 和视频按支持情况生成网页预览。
- 申报通过后计入累计时长；驳回后不计入，并删除对应证明原文件和预览文件。
- 在“我的志愿时长”查看累计、待审核、已通过、已驳回记录及每条申报详情。
- 上传学校系统导出的 `.xls` 或 `.xlsx` 个人课表（最大 5 MB）；重新上传会替换当前课表，只保存解析后的课程数据和文件元信息，不长期保存课表原文件。
- 桌面课表按星期和节次显示，手机端按星期分组显示；课程保留课程名称、起止钟点和上课周次。
- 通过独立的“特长词云”浏览全体志愿者特长，点击词条查看擅长该项的同学；志愿者端不公开学号和联系方式。
- 在“个人信息”维护姓名、账号、学号、年级、专业、班级、联系方式和自定义特长；“可服务时间”字段已完全移除。
- 浏览有权限访问的活动资料；文件预览在新标签页打开。
- 查看已发布教程及教程附件，使用消息中心并支持一键已读。
- 任务广场、任务接取、取消申请和完成证明流程仍可使用，目前收纳在“隐藏”分组。

### 部门负责人端

- 首页直接显示待审核志愿时长；首页统计卡片可进入对应业务页面。
- 在独立的“志愿时长管理”查看每位志愿者累计时长、当月时长和全部申报详情。
- 自主申报和任务完成后的时长在同一审核队列处理，支持查看证明材料悬浮预览、逐条通过/驳回和批量通过。
- 已通过的志愿时长可以再次驳回；驳回会扣除已计入时长、通知志愿者，并删除证明附件及其转码产物。
- 导出 Excel 汇总表：可按某月或全部记录导出，表格仅包含姓名、学号和总志愿时长。
- 在“课表管理”查看所有已录入课表的志愿者及“查看课表”按钮，并单独列出尚未录入人员。
- 课表查询条件可自由组合：日期、时间点、姓名/学号、专业和班级。只选择日期时显示全体志愿者当日时间线：绿色为空闲、红色为上课、相邻课程间不超过 60 分钟的空档为黄色；悬停或点按可查看对应时间。只选择时间点时按当天判断。
- 查看志愿者列表、资料完整度和账号状态，并进入个人详情或课表。
- 通过独立的“特长词云”查看特长分布；点击词条显示对应同学，管理员可继续进入志愿者详情。
- 创建、编辑、发布和删除教程；富文本正文支持字体、字号、有限强调色、加粗、斜体、下划线、删除线和在光标位置插入图片。格式按钮会像 Office 一样实时显示当前光标或输入状态，正在使用的格式与色块保持蓝色选中提示。默认文字会随深浅模式自动使用黑/白文字，强调色仅提供蓝、绿、橙、红、紫五组双主题适配色，不开放任意取色。编辑过程中仍可保存草稿并上传单个最大 100 MB 的附件。正文图片单张最大 20 MB、每篇最多 30 张，落盘前统一压缩为 1080p 范围内 JPG。离开存在未保存内容的编辑页时，必须选择保存草稿、放弃修改或继续编辑。
- 管理资料中心的活动项目、文件夹和文件：支持按精确文件名关键词及上传日期全局搜索、文件夹打包下载、批量下载、批量移动、批量删除、拖拽移动和悬停面包屑进入上级目录。
- 资料中心预览会在新标签页打开；图片、视频和 Office 文件按类型生成网页预览。
- 在“个人信息”修改姓名、登录账号和密码；管理员页面不显示志愿者使用的电话、QQ、微信编辑区域。
- 发布任务、审核取消申请和任务提交；任务管理目前收纳在“隐藏”分组。
- 通告页面和操作日志页面已从产品导航与用户界面移除；数据库中仍保留相应兼容模型，迁移旧数据时不要手工删除相关表。

### 超级管理员端

- 使用不在普通登录页公开展示的独立入口登录。
- 创建部门负责人和普通志愿者账号；校验姓名、账号、角色和初始密码，密码使用 Node.js `scrypt` 哈希后写入数据库。
- 新建志愿者时，登录账号同时作为初始学号，并自动创建志愿者资料记录。
- 管理账号状态和系统设置。
- 在“系统设置”编辑并总开关全站悬浮公告；开启后公告覆盖管理员端、志愿者端和登录页。用户可关闭当前页面的提示，但刷新或重新打开网页后，只要总开关仍开启就会再次出现。
- 删除账号时可选择“保留关联信息”或“永久删除账号及个人关联信息”。永久删除需要输入用户名二次确认，并清理报名、任务提交、志愿时长、消息、证明附件和本人上传文件；共享业务内容会转交当前超级管理员。
- 超级管理员继承部门负责人的志愿者、课表、时长、教程和资料中心管理能力。

### 当前导航结构

- 部门负责人可见：首页、志愿者管理、特长词云、课表管理、资料中心、志愿时长管理、教程管理、个人信息。
- 部门负责人隐藏分组：任务管理。
- 志愿者可见：首页、申请志愿时长、我的课表、特长词云、资料中心、教程中心、个人信息。
- 志愿者隐藏分组：任务广场、我的志愿时长。
- 通告入口已删除；教程、课表、特长词云和志愿时长管理不再放在隐藏分组。

## 界面设计规范

网站采用面向高校内部工作的 Apple 风格界面体系，并支持浅色、深色和跟随系统三种外观：

- 使用 Apple 平台系统字体、苹方及其他平台系统无衬线字体，针对中文正文、标题和数字信息调整字号、字重、行高与字距。
- 页面使用柔和浅灰背景、白色内容区域、低对比度分割线和克制的系统蓝；成功、警告和错误状态分别采用系统绿、橙、红。
- 桌面端使用固定侧边栏和浮动材质顶栏；平板与手机使用覆盖完整设备高度的抽屉导航，处理顶部和底部安全区，并在打开抽屉时锁定背景滚动。
- 手机端最低支持 320 px 宽度。顶部栏在窄屏自动隐藏次要账号文字，主要图标、按钮和导航项保持约 44 px 的触控区域；输入控件使用 16 px 字号避免 iOS 聚焦自动放大。
- 通用数据表在手机端转换为信息卡片；手写的志愿者、课表和时长表格也提供独立卡片布局。桌面课表在手机端改为按星期分组的纵向课程列表。
- 资料中心进入活动项目或文件夹后，手机端使用独立文件卡片、纵向筛选区和局部滚动面包屑；空间不足时优先保留操作按钮和完整文件大小，文件名自动省略，不再让整个页面横向溢出。
- 按钮、卡片、状态标签、表格、输入框、上传控件、弹窗、资料预览和操作反馈使用统一圆角、边框、阴影与焦点状态。
- 全站临时公告使用顶层悬浮材质，不挤压页面结构；关闭按钮保持 44 px 触控区域，适配安全区、深色模式和 320 px 手机宽度。
- 交互反馈在按下时立即出现，时间线提示直接跟随光标或点按位置；动效主要使用短促的透明度、颜色和位移反馈，避免装饰性动画。
- 支持 `prefers-reduced-motion`、`prefers-reduced-transparency` 和 `prefers-contrast`，分别降低运动、减少透明材质并增强边界对比度。
- 页面导航使用真实历史记录，浏览器返回/继续不会直接重置到首页；教程编辑页的未保存内容会拦截站内跳转、顶部返回和退出登录。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| Web 框架 | Next.js 15 App Router |
| 语言 | TypeScript 5、React 19 |
| 样式 | Tailwind CSS 3 |
| 数据库 ORM | Prisma 6 |
| 数据库 | MySQL |
| 校验 | Zod |
| 密码哈希 | Node.js `scrypt` |
| Excel 课表解析/导出 | SheetJS `xlsx` 0.20.3 |
| 文件预览与图片压缩 | FFmpeg、LibreOffice |

## 关键文件限制

| 类型 | 上限 | 处理方式 |
| --- | ---: | --- |
| 资料中心文件 | 界面提示 100 MB；硬限制 500 MB | 保留原文件；按类型生成预览 |
| 教程附件 | 100 MB | 保留原文件，随教程下载 |
| 教程正文图片 | 20 MB/张，每篇最多 30 张 | 转为 1080p 范围内 JPG，跟随教程权限显示 |
| 志愿时长/任务证明 | 20 MB | 图片转为 1080p 以内 JPG，其他支持格式生成预览 |
| 个人课表 | 5 MB | 仅接受 `.xls`、`.xlsx`，保存解析结果而非课表原文件 |

Nginx 的 `client_max_body_size` 应略高于系统最大单文件限制，本文示例使用 `520m`。

## 用户角色与入口

| 角色 | Prisma 枚举 | 登录入口 | 默认页面 |
| --- | --- | --- | --- |
| 超级管理员 | `SUPER_ADMIN` | `/superadmin/login` | `/admin` |
| 部门负责人 | `ADMIN` | `/admin/login` | `/admin` |
| 志愿者 | `VOLUNTEER` | `/volunteer/login` | `/volunteer` |

超级管理员入口不会在普通登录页中公开展示。

## 项目结构

```text
.
├── prisma/
│   ├── migrations/        # MySQL 数据库迁移
│   ├── schema.prisma      # 数据模型
│   └── seed.mjs           # 测试数据（会清空现有数据）
├── src/
│   ├── app/
│   │   ├── admin/         # 部门负责人和超级管理员页面
│   │   ├── volunteer/     # 志愿者页面
│   │   └── api/           # API 路由
│   ├── components/        # 页面组件与交互组件
│   ├── lib/               # 权限、数据访问、会话和文件存储
│   └── types/             # TypeScript 类型
├── middleware.ts          # 页面角色路由保护
├── next.config.ts
└── package.json
```

## 环境要求

推荐生产环境：

- Linux 服务器（Ubuntu 22.04/24.04 或同类发行版）
- Node.js 20 LTS 或 22 LTS
- npm 10 或更高版本
- MySQL 8.0
- FFmpeg（图片和视频转换、视频海报）
- LibreOffice（Word、Excel、PowerPoint 转 PDF 预览）
- Fontconfig 与中文字体
- Nginx 或其他反向代理
- 至少 2 GB 内存；需要转换视频时建议 4 GB 或更多

Ubuntu/Debian 可安装以下系统依赖：

```bash
sudo apt update
sudo apt install -y mysql-server ffmpeg libreoffice fontconfig fonts-noto-cjk nginx
```

确认命令可用：

```bash
node --version
npm --version
mysql --version
ffmpeg -version
soffice --version
```

## 环境变量

生产环境建议创建 `.env.production`，不要将真实密码提交到 Git。

```dotenv
# MySQL 连接字符串。特殊字符需要进行 URL 编码。
DATABASE_URL="mysql://wenti_app:strong_password@127.0.0.1:3306/wenti_center"

# 资料库持久化目录，必须使用绝对路径并允许运行用户读写。
FILE_STORAGE_ROOT="/var/lib/wenti-storage"

# 转换工具路径；如果已加入 PATH，也可以填写命令名。
SOFFICE_PATH="/usr/bin/soffice"
FFMPEG_PATH="/usr/bin/ffmpeg"

# 清理策略：过期临时文件 24 小时，孤立预览文件 7 天。
TEMP_FILE_RETENTION_HOURS="24"
ORPHAN_PREVIEW_RETENTION_DAYS="7"
TUTORIAL_INLINE_IMAGE_RETENTION_HOURS="24"
```

代码当前实际读取的环境变量只有：

| 变量 | 必需 | 用途 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | Prisma 连接 MySQL |
| `FILE_STORAGE_ROOT` | 使用资料库时必需 | 原文件、预览文件和临时文件目录 |
| `SOFFICE_PATH` | 否 | LibreOffice 路径，默认 `soffice` |
| `FFMPEG_PATH` | 否 | FFmpeg 路径，默认 `ffmpeg` |
| `TEMP_FILE_RETENTION_HOURS` | 否 | `temp/` 临时内容保留小时数，默认 24 |
| `ORPHAN_PREVIEW_RETENTION_DAYS` | 否 | 数据库未引用的预览文件保留天数，默认 7 |
| `TUTORIAL_INLINE_IMAGE_RETENTION_HOURS` | 否 | 已上传但未随教程保存的正文图片保留小时数，默认 24 |

`.env.example` 中的 `NEXTAUTH_SECRET` 和 `NEXTAUTH_URL` 目前未被登录代码使用，不能依赖它们保护当前会话。

## 首次部署

以下示例将项目部署到 `/opt/wenti`，资料存储在 `/var/lib/wenti-storage`。

### 1. 创建运行用户和目录

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin wenti
sudo mkdir -p /opt/wenti /var/lib/wenti-storage
sudo chown -R wenti:wenti /opt/wenti /var/lib/wenti-storage
```

将项目文件上传到 `/opt/wenti`。不要从开发机复制以下内容：

```text
node_modules/
.next/
.env
.env.local
资料库存储目录中的 temp/
```

### 2. 创建 MySQL 数据库

以 MySQL 管理员身份执行：

```sql
CREATE DATABASE wenti_center
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'wenti_app'@'127.0.0.1'
  IDENTIFIED BY '请替换为强密码';

GRANT ALL PRIVILEGES ON wenti_center.*
  TO 'wenti_app'@'127.0.0.1';

FLUSH PRIVILEGES;
```

把相同的用户名、密码和数据库名写入 `/opt/wenti/.env.production` 的 `DATABASE_URL`。

### 3. 安装依赖

```bash
cd /opt/wenti
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
```

### 4. 执行数据库迁移

生产环境必须使用 `migrate deploy`，不要使用会进入交互流程的 `migrate dev`：

```bash
cd /opt/wenti
sudo -u wenti npx prisma migrate deploy
```

### 5. 初始化测试数据（仅限全新测试环境）

```bash
sudo -u wenti npm run db:seed
```

> **危险：** `prisma/seed.mjs` 会先删除数据库中的消息、任务、志愿时长、资料记录和全部用户，然后重新创建测试数据。生产数据库、已导入旧数据的数据库绝对不要运行此命令。

种子数据包含 `superadmin`、`admin1`、`admin2`、`volunteer1` 和 `volunteer2` 等测试账号，初始密码为 `123456`。测试完成后必须修改密码或删除测试账号。

### 6. 构建与启动

```bash
cd /opt/wenti
sudo -u wenti npm run build
sudo -u wenti npm run start -- -p 3000
```

本机验证：

```bash
curl -I http://127.0.0.1:3000/login
```

开发环境使用：

```bash
npm run dev -- -p 3000
```

## 使用 systemd 保持服务运行

创建 `/etc/systemd/system/wenti.service`：

```ini
[Unit]
Description=Wenti volunteer management web application
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=wenti
Group=wenti
WorkingDirectory=/opt/wenti
Environment=NODE_ENV=production
EnvironmentFile=/opt/wenti/.env.production
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

`node` 或 `npm` 如果不在 `/usr/bin`，先运行 `command -v npm`，再修改 `ExecStart` 为服务器上的真实绝对路径。

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wenti
sudo systemctl status wenti
sudo journalctl -u wenti -f
```

## Nginx 反向代理

创建 `/etc/nginx/sites-available/wenti`：

```nginx
server {
    listen 80;
    server_name example.com;

    # 系统单文件上限是 500 MB，代理层需要略大于该值。
    client_max_body_size 520m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 视频和 Office 文件转换可能耗时较长。
        proxy_connect_timeout 60s;
        proxy_send_timeout 1800s;
        proxy_read_timeout 1800s;
        proxy_request_buffering off;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/wenti /etc/nginx/sites-enabled/wenti
sudo nginx -t
sudo systemctl reload nginx
```

正式环境应配置 HTTPS，例如使用 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

仅对外开放 80/443 端口；MySQL 和 3000 端口应限制为本机或可信内网访问。

## 从现有环境迁移数据

系统数据由两部分组成，必须一起迁移：

1. MySQL 数据库：账号、任务、消息、志愿时长、文件元数据等。
2. `FILE_STORAGE_ROOT`：上传的原文件、预览文件和视频海报。

### 1. 导出旧数据库

```bash
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  -u OLD_USER -p OLD_DATABASE > wenti-backup.sql
```

### 2. 复制资料库

建议迁移前短暂停止写入，然后使用 `rsync`：

```bash
rsync -aH --info=progress2 /旧服务器/资料库目录/ user@new-server:/var/lib/wenti-storage/
```

不需要复制 `temp/` 中的临时文件。必须保留 `originals/` 和 `previews/`。

### 3. 导入新数据库

```bash
mysql -u wenti_app -p wenti_center < wenti-backup.sql
cd /opt/wenti
sudo -u wenti npx prisma migrate deploy
```

导入已有数据后不要运行 `npm run db:seed`。

### 4. 修正权限并验证

```bash
sudo chown -R wenti:wenti /var/lib/wenti-storage
sudo -u wenti test -r /var/lib/wenti-storage
sudo -u wenti test -w /var/lib/wenti-storage
sudo systemctl restart wenti
```

迁移完成后至少验证：

- 三类账号能否从各自入口登录
- 志愿者资料、特长和志愿时长是否完整
- 任务列表、报名、取消和审核流程是否正常
- 消息、一键已读和教程附件是否正常
- 志愿者课表能否重新上传、管理员能否查看课表并按日期/时间筛选空闲人员
- 某月与全部志愿时长 Excel 是否能够正常导出
- 资料库目录、下载、图片、视频和 Office 预览是否正常
- 上传接近 500 MB 的文件是否会被 Nginx 拒绝

## 更新部署

每次发布新代码：

```bash
cd /opt/wenti
sudo systemctl stop wenti

# 拉取或上传新代码后
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npx prisma migrate deploy
sudo -u wenti npm run build

sudo systemctl start wenti
sudo systemctl status wenti
```

如果更新失败，应恢复上一版代码和与其匹配的数据库备份。不要在生产环境执行 `prisma migrate dev` 或手工修改迁移历史。

## 资料库存储说明

`FILE_STORAGE_ROOT` 下会自动创建：

```text
wenti-storage/
├── originals/       # 资料中心目录树、教程附件和 tutorial-images/ 正文图片
├── hour-proofs/     # 自主申报志愿时长的非图片证明原文件
├── task-proofs/     # 任务完成申报的非图片证明原文件
├── proof-previews/  # 证明材料的 JPG、MP4、PDF 和视频海报预览
├── previews/        # 资料中心的 PDF、图片、视频和海报预览
└── temp/            # LibreOffice 临时配置，可随时清理
```

例如，网页中的结构：

```text
2026迎新晚会
└── 宣传资料
    └── 海报终稿.psd
```

会原样保存为：

```text
FILE_STORAGE_ROOT/originals/2026迎新晚会/宣传资料/海报终稿.psd
```

活动项目、文件夹和文件的创建、重命名、移动与删除都会同步到 `originals/`。`storageKey` 保存的也是这条可读相对路径，不再使用 UUID 等随机字符串代替原文件名。`previews/` 是系统生成的缓存文件，为避免同名预览互相覆盖，仍使用独立内部名称；这不会改变或替换 `originals/` 中的上传文件。

志愿时长自主申报的非图片证明保存在 `hour-proofs/<志愿者ID>/<申请ID>/<上传时原文件名>`；任务完成证明保存在 `task-proofs/` 的对应目录。图片证明上传后会直接压缩为最长边不超过 1920×1080 的 JPG，压缩成功后删除原图片，只保留 JPG；其他支持预览的格式会在 `proof-previews/` 生成独立预览。证明下载和预览接口会验证登录身份，仅申请人本人、部门负责人和超级管理员可以访问。任何待审核或已通过记录被驳回时，数据库会清空证明字段，并删除原文件和全部预览产物。

注意事项：

- 资料中心上传区显示“最多 100MB”，但前端和接口硬限制为 500MB；教程附件最大 100 MB；志愿时长证明最大 20 MB；课表文件最大 5 MB。
- 资料中心原文件保留上传时的原始文件名、扩展名和文件内容；该规则不适用于志愿时长图片证明，图片证明会转为 1080p 以内的 JPG。
- 资料中心的拖放移动和批量操作沿用现有部门负责人修改权限，不改变志愿者的资料访问权限。
- 拖放用于将文件移动到当前活动项目内的文件夹或面包屑上级目录；在顶部目录地址短暂停留会保持拖拽状态并自动进入该目录，松开后仍需确认。批量移动可同时处理文件和文件夹，系统仍会阻止循环目录和目标目录中的同名项目。
- 批量删除会永久删除选中的项目；若包含文件夹，其内部内容也会一并删除，因此执行前必须通过确认提示。
- 图片网页预览会生成为 JPG，但原图片不会被转换或覆盖。
- 视频预览使用 H.264/AAC，转换最长允许约 30 分钟。
- Office 文件通过 LibreOffice 无界面模式转换成 PDF。
- 访问预览或视频封面时会检查磁盘文件；如果预览缺失但原文件仍存在，系统会自动重新生成并更新数据库状态。
- `FILE_STORAGE_ROOT` 必须位于持久化磁盘，不能放在会随部署清空的临时目录。
- 数据库记录与资料文件互相关联，备份和恢复时应保持时间点一致。

### 定期清理临时文件和孤立预览

系统提供安全清理脚本：

```bash
# 只检查，不删除
npm run storage:cleanup:dry-run

# 执行清理
npm run storage:cleanup
```

清理规则：

- 删除超过 `TEMP_FILE_RETENTION_HOURS` 的 `temp/` 顶层内容，默认保留 24 小时。
- 扫描 `previews/` 中的 PDF、图片、视频和海报。
- 只删除数据库 `FileResource` 已不再引用，并且超过 `ORPHAN_PREVIEW_RETENTION_DAYS` 的孤立预览，默认保留 7 天。
- 删除超过 `TUTORIAL_INLINE_IMAGE_RETENTION_HOURS` 仍未绑定教程的正文图片数据库记录和 JPG，默认保留 24 小时；已保存教程中的图片不会被此规则删除。
- 数据库仍在引用的 PDF 和其他预览属于业务缓存，清理脚本会保留，否则网页预览会失效。
- 即使预览因人工操作或磁盘故障意外缺失，用户下次访问时也会按需重新生成；原文件缺失时无法恢复。
- `originals/` 原文件不在定时清理范围内。
- `hour-proofs/`、`task-proofs/` 和 `proof-previews/` 不在通用定时清理范围内，应与数据库一起备份，并由审核驳回、任务删除或账号连带删除流程清理。

### 将旧版随机文件名迁移为可读目录树

升级已有部署后，先停止网页写入并备份数据库与 `FILE_STORAGE_ROOT`，再执行：

```bash
# 只检查预计迁移数量，不修改文件
npm run storage:sync-tree:dry-run

# 移动原文件并同步数据库 storageKey
npm run storage:sync-tree
```

该命令会创建网页中现有的活动项目和空文件夹，并把旧的 `originals/<随机字符串>.<扩展名>` 移动到对应的“活动项目/文件夹/原文件名”位置。遇到目标位置已有文件时会停止并拒绝覆盖；旧版外部链接会计入 `legacyLinks` 且保持不变，磁盘原文件缺失时会计入 `missing`、输出警告并跳过。迁移完成后应重新启动网页服务，并抽查下载和预览。

建议先连续运行几天 `storage:cleanup:dry-run` 检查输出，再启用自动删除。

生产服务器可创建 `/etc/systemd/system/wenti-storage-cleanup.service`：

```ini
[Unit]
Description=Clean expired Wenti temporary and orphan preview files
After=mysql.service

[Service]
Type=oneshot
User=wenti
Group=wenti
WorkingDirectory=/opt/wenti
Environment=NODE_ENV=production
EnvironmentFile=/opt/wenti/.env.production
ExecStart=/usr/bin/npm run storage:cleanup
```

再创建 `/etc/systemd/system/wenti-storage-cleanup.timer`：

```ini
[Unit]
Description=Run Wenti storage cleanup daily

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
RandomizedDelaySec=15m

[Install]
WantedBy=timers.target
```

启用并检查定时器：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wenti-storage-cleanup.timer
sudo systemctl list-timers wenti-storage-cleanup.timer
sudo systemctl start wenti-storage-cleanup.service
sudo journalctl -u wenti-storage-cleanup.service -n 100 --no-pager
```

## 备份建议

至少每日备份：

```bash
mysqldump --single-transaction -u wenti_app -p wenti_center \
  | gzip > /backup/wenti-db-$(date +%F).sql.gz

rsync -a --delete /var/lib/wenti-storage/ /backup/wenti-storage/
```

建议：

- 数据库和文件存储使用同一备份批次。
- 备份目录不要与业务目录放在同一块磁盘。
- 定期在独立环境进行恢复演练。
- 备份 `.env.production` 时应加密并限制访问权限。

## 生产环境安全检查

### 上公网前必须完成

- **加固会话机制。** 当前 `src/lib/session.ts` 只对会话 JSON 做 Base64URL 编码，没有签名或加密；Cookie 也设置为 `httpOnly: false`。攻击者可能伪造角色 Cookie。公开部署前必须改为有服务端密钥签名的会话，并启用 `HttpOnly`、`Secure` 和合适的过期策略。
- `.env.example` 中的 `NEXTAUTH_SECRET` 当前没有接入上述会话实现，单纯填写该变量不会解决问题。
- 删除或禁用测试账号，修改所有初始密码。
- 只通过 HTTPS 提供服务。
- 限制 MySQL、3000 端口和资料库存储目录的访问权限。
- 为 MySQL 使用独立的最小权限账号，不要使用 `root`。
- 检查仍为占位实现的 CRUD 接口，再决定是否开放对应管理功能。

### 建议完成

- 增加登录限流、失败次数限制和安全审计。
- 增加 CSRF 防护与更严格的安全响应头。
- 对上传文件做病毒扫描和内容类型复核。
- 配置错误监控、磁盘容量监控和数据库慢查询监控。
- 为 FFmpeg/LibreOffice 转换任务设置独立队列，避免高并发耗尽 Web 进程资源。

## 常见问题

### Prisma 无法连接 MySQL

检查：

```bash
sudo systemctl status mysql
sudo -u wenti npx prisma migrate status
```

确认 `DATABASE_URL` 中的密码已 URL 编码，数据库用户允许从 `127.0.0.1` 登录。

### 上传时报“未配置 FILE_STORAGE_ROOT”

确认 systemd 的 `EnvironmentFile` 路径正确，并确保目录存在且运行用户可读写：

```bash
sudo -u wenti test -r /var/lib/wenti-storage
sudo -u wenti test -w /var/lib/wenti-storage
```

### 图片或视频预览失败

```bash
sudo -u wenti /usr/bin/ffmpeg -version
sudo journalctl -u wenti -n 200 --no-pager
```

检查 `FFMPEG_PATH`，并确认 FFmpeg 构建支持 `libx264` 和 AAC。

### Office 文件无法预览

```bash
sudo -u wenti /usr/bin/soffice --headless --version
fc-list :lang=zh | head
```

检查 `SOFFICE_PATH`、中文字体和 `FILE_STORAGE_ROOT/temp` 的写入权限。

### Nginx 返回 413

把 `client_max_body_size` 设置为大于 500 MB（本文示例为 `520m`），并执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 构建失败

```bash
rm -rf .next
npm ci
npx prisma generate
npm run build
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev -- -p 3000` | 3000 端口启动开发服务 |
| `npm run build` | 生产构建与类型检查 |
| `npm run start -- -p 3000` | 启动生产服务 |
| `npx prisma generate` | 生成 Prisma Client |
| `npx prisma migrate deploy` | 在生产环境应用迁移 |
| `npx prisma migrate status` | 查看迁移状态 |
| `npm run db:seed` | 重置并写入测试数据，生产环境禁用 |
| `npm run storage:cleanup:dry-run` | 检查可清理文件但不删除 |
| `npm run storage:cleanup` | 清理过期临时文件和孤立预览 |
| `npm run storage:sync-tree:dry-run` | 检查旧资料迁移结果但不修改文件 |
| `npm run storage:sync-tree` | 将原文件同步为与资料中心一致的可读目录树 |

## 上线前最终清单

- [ ] 本次代码、数据库或配置修改已同步更新 README
- [ ] 已完成会话签名和安全 Cookie 改造
- [ ] 已删除测试账号并修改全部初始密码
- [ ] `.env.production` 未提交到版本库且权限为 `600`
- [ ] MySQL 数据迁移和 `prisma migrate deploy` 成功
- [ ] `FILE_STORAGE_ROOT` 已完整迁移并修正权限
- [ ] 资料库清理脚本已先 dry-run 验证并启用定时器
- [ ] FFmpeg、LibreOffice 和中文字体可用
- [ ] `npm run build` 成功
- [ ] systemd 服务可自动启动和故障重启
- [ ] Nginx 已配置 110 MB 上传限制和长任务超时
- [ ] HTTPS 证书生效
- [ ] 数据库和资料库备份已完成恢复演练
- [ ] 三类角色的核心业务流程已人工验收
