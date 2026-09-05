# 文艺体育中心志愿服务管理系统：AI 部署手册

本文件用于把项目交给另一台服务器上的 AI 或运维人员后快速完成部署。默认目标是 **Ubuntu 22.04/24.04 + MySQL 8 + systemd + Nginx**，应用监听本机 `127.0.0.1:3000`，Nginx 对外提供 HTTP/HTTPS。

项目完整功能、数据模型、存储规则和安全说明见 [README_FULL.md](./README_FULL.md)。部署执行者必须先读完本文件的“禁止事项”和“部署前决策”。

## GitHub 更新通道

本项目已经接入 GitHub：

```text
https://github.com/qiufengbrm/wenti
```

服务器后续更新应优先使用 Git，而不是每次重新接收整个项目文件夹。第一次可以克隆仓库；之后每次版本更新在 `/opt/wenti` 执行 `git pull`，Git 会同步本次变化的文件。`.env.production`、数据库、上传附件和 `FILE_STORAGE_ROOT` 仍保留在服务器本地，不由 Git 管理。

首次用 Git 部署时：

```bash
sudo -u wenti git clone https://github.com/qiufengbrm/wenti.git /opt/wenti
cd /opt/wenti
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npx prisma migrate deploy
sudo -u wenti npm run build
sudo systemctl restart wenti
```

已有 `/opt/wenti` 部署切换到 Git 管理时，不要直接覆盖目录。先备份当前代码、数据库和 `FILE_STORAGE_ROOT`，确认 `/opt/wenti` 内没有只存在于服务器而未备份的业务改动，再由部署 AI 制定切换步骤。密码文件、附件目录和生产配置不能被 Git 操作覆盖。

## 0. 把项目交给云服务器 AI 之前

可以把整个 `wenti` 项目目录交给云服务器上的 AI，但不要将开发机目录原封不动地上传。交付包应是源码包；本地构建产物、依赖、密码和临时文件需要排除。

### 源码包必须保留

至少保留以下内容：

```text
README.md
README_FULL.md
README_DEPLOY.md
package.json
package-lock.json
next.config.ts
middleware.ts
postcss.config.mjs
tsconfig.json
prisma/
public/
scripts/
src/
```

如果项目中还有其他受版本管理的配置文件，也应一并保留。不要只复制 `src/`，否则数据库迁移、静态资源、构建配置和维护脚本会缺失。

### 不要放入源码包

上传前排除以下内容：

```text
node_modules/
.next/
.env
.env.local
.env.production
*.log
FILE_STORAGE_ROOT/temp/
```

- `.env*` 可能包含数据库密码，不要通过聊天、公开网盘或普通源码包传递。
- 云服务器应根据第 7 节重新创建 `.env.production`，密码通过安全渠道提供。
- `node_modules/` 和 `.next/` 与开发机操作系统及构建环境相关，服务器应使用 `npm ci` 和 `npm run build` 重新生成。
- 不要把本地 Git 凭据、SSH 私钥、数据库客户端配置或系统备份混入源码包。

### 是否需要迁移当前网站数据

如果只需要部署一个全新的空网站，源码包即可，但仍需确定首个管理员账号的初始化方式。

如果需要保留当前网站中的账号、志愿时长、课表、教程、消息和资料，则除了源码包，还必须单独准备：

1. MySQL 完整导出文件，例如 `wenti-backup.sql`。
2. 当前 `FILE_STORAGE_ROOT` 的完整备份，至少包含 `originals/`、`previews/`、`hour-proofs/`、`task-proofs/` 和 `proof-previews/`。
3. 目标域名、部署范围（内网或公网）、数据库来源、存储路径和初始管理员来源。

数据库备份和文件存储备份必须来自同一个停写时间点，否则数据库中的附件记录可能与磁盘文件不一致。数据库备份与附件备份建议通过受控的 SSH/SFTP、加密磁盘或其他安全渠道传输，不要直接粘贴进 AI 对话。

### 可直接发给云服务器 AI 的开场提示词

```text
请先完整阅读项目根目录中的 README_DEPLOY.md 和 README_FULL.md。先对服务器、源码包、数据库备份和附件存储备份做只读检查并报告结果，不要立即安装、覆盖、迁移或启动。

确认部署模式（全新空环境或迁移现有数据）、内网/公网范围、正式域名、MySQL 来源、FILE_STORAGE_ROOT 路径和首个管理员来源后，再严格按照 README_DEPLOY.md 分阶段执行。

禁止在已有数据环境运行 npm run db:seed；禁止在生产环境运行 prisma migrate dev、prisma db push 或 prisma migrate reset；禁止覆盖或清空已有数据库、附件目录、Nginx 配置和 systemd 服务。每个阶段都要检查退出码，失败时立即停止并报告。

如果目标要开放到公网，必须先完成 README 中要求的会话签名、安全 Cookie、CSRF 和登录限流加固，未完成前不要公开上线。部署完成后执行 README_DEPLOY.md 中的完整业务验收，并只汇报非敏感结果，不得在对话或日志中输出密码、连接字符串、Cookie、私钥或管理员初始密码。
```

> 仅把 `wenti` 源码目录上传到服务器，并不等于当前业务数据已经迁移。MySQL 数据和 `FILE_STORAGE_ROOT` 文件是两套独立的持久化数据，迁移现有网站时二者缺一不可。

## 1. 给部署 AI 的执行规则

1. 先只做只读检查，不要立刻安装、覆盖、迁移或启动。
2. 每完成一个阶段都验证退出码和关键输出；失败时停止，不要跳过错误继续部署。
3. 不要在终端输出、聊天记录或日志中回显数据库密码、Cookie、私钥和 `.env.production` 内容。
4. 遇到已有数据库、已有存储目录或已有同名 systemd/Nginx 配置时，先备份并向用户确认，禁止覆盖。
5. 所有数据库和存储迁移必须使用同一时间点的备份。
6. 默认部署路径：
   - 应用：`/opt/wenti`
   - 持久化文件：`/var/lib/wenti-storage`
   - systemd：`wenti.service`
   - Nginx：`/etc/nginx/sites-available/wenti`
7. 如果用户指定了其他路径、域名、端口或数据库，统一替换后再执行，不要同时维护两套值。

### 绝对禁止

- 不要在已有数据的环境执行 `npm run db:seed`。
- 不要在生产环境执行 `prisma migrate dev`、`prisma db push`、`prisma migrate reset`。
- 不要删除或清空 MySQL 数据库、`FILE_STORAGE_ROOT`、`originals/`、`hour-proofs/`、`task-proofs/`、`proof-previews/`。
- 不要把开发机的 `.env`、`.env.local`、`node_modules/`、`.next/` 或存储目录中的 `temp/` 直接复制到生产服务器。
- 不要让 MySQL 或应用的 3000 端口直接暴露到公网。
- 不要在没有备份和用户确认的情况下覆盖已有 Nginx、systemd 或环境变量文件。

## 2. 部署前必须确认的决策

部署 AI 应先向用户确认以下信息：

| 项目 | 必须确认的值 |
| --- | --- |
| 部署模式 | `新建空环境` 或 `迁移已有数据` |
| 网络范围 | 仅可信内网，或公网域名 |
| 域名 | 例如 `volunteer.example.edu.cn`；仅内网可暂时使用 IP |
| MySQL | 本机 MySQL，或已有受控数据库地址 |
| 数据来源 | MySQL 备份文件、资料库存储备份，或明确的全新空数据库 |
| 初始账号 | 已有数据库中的管理员账号；没有账号时必须由项目所有者决定初始化方案 |
| HTTPS | 公网部署必须启用；内网也建议启用 |

> **重要安全边界：** 当前登录会话只适合可信内网测试。`src/lib/session.ts` 中的会话尚未使用服务端密钥签名，Cookie 也未完成公网级加固。若目标是公网，部署 AI 必须先停止部署，完成 README 中“生产环境安全检查”列出的会话签名、`HttpOnly`、`Secure`、CSRF 和登录限流加固，再继续上线。

## 3. 服务器预检

先执行只读检查并记录输出：

```bash
uname -a
cat /etc/os-release
node --version
npm --version
mysql --version
ffmpeg -version
soffice --version
nginx -v
df -h
free -h
command -v node
command -v npm
command -v ffmpeg
command -v soffice
command -v nginx
```

推荐最低环境：

- Node.js 20 LTS 或 22 LTS
- npm 10+
- MySQL 8.0
- FFmpeg
- LibreOffice
- Fontconfig 与 Noto CJK 中文字体
- Nginx
- 2 GB 内存；涉及较多视频转换时建议 4 GB+
- 存储容量需覆盖数据库、原文件、证明附件、教程附件和预览缓存

Ubuntu/Debian 缺少依赖时安装：

```bash
sudo apt update
sudo apt install -y mysql-server ffmpeg libreoffice fontconfig fonts-noto-cjk nginx rsync curl
```

## 4. 创建运行用户与目录

先检查目标是否已存在：

```bash
getent passwd wenti || true
sudo ls -ld /opt/wenti /var/lib/wenti-storage 2>/dev/null || true
```

确认是全新部署后创建：

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin wenti
sudo mkdir -p /opt/wenti /var/lib/wenti-storage
sudo chown -R wenti:wenti /opt/wenti /var/lib/wenti-storage
sudo chmod 750 /opt/wenti /var/lib/wenti-storage
```

如果用户或目录已经存在，不要重复创建或直接改属主；先确认它们是否属于旧部署。

## 5. 上传项目代码

把源码复制到 `/opt/wenti`。最终至少应包含：

```text
README.md
README_FULL.md
README_DEPLOY.md
package.json
package-lock.json
next.config.ts
middleware.ts
prisma/
src/
scripts/
```

不要上传：

```text
node_modules/
.next/
.env
.env.local
.env.production
FILE_STORAGE_ROOT/temp/
```

复制后检查并修正权限：

```bash
sudo chown -R wenti:wenti /opt/wenti
sudo -u wenti test -r /opt/wenti/package.json
sudo -u wenti test -r /opt/wenti/package-lock.json
```

## 6. 配置 MySQL

### 6.1 全新数据库

仅在确认数据库不存在时，以 MySQL 管理员身份执行：

```sql
CREATE DATABASE wenti_center
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'wenti_app'@'127.0.0.1'
  IDENTIFIED BY '替换为独立强密码';

GRANT ALL PRIVILEGES ON wenti_center.*
  TO 'wenti_app'@'127.0.0.1';

FLUSH PRIVILEGES;
```

密码包含 `@`、`:`、`/`、`?`、`#` 等字符时，在 `DATABASE_URL` 中必须进行 URL 编码。

### 6.2 迁移已有数据库

旧环境导出：

```bash
mysqldump --single-transaction --routines --triggers --default-character-set=utf8mb4 \
  -u OLD_USER -p OLD_DATABASE > wenti-backup.sql
```

新环境导入前先确认目标数据库为空，然后执行：

```bash
mysql -u wenti_app -p wenti_center < wenti-backup.sql
```

导入已有数据库后，后续仍要运行 `npx prisma migrate deploy`，但绝对不要运行 seed。

## 7. 配置生产环境变量

创建 `/opt/wenti/.env.production`：

```dotenv
DATABASE_URL="mysql://wenti_app:URL_ENCODED_PASSWORD@127.0.0.1:3306/wenti_center"
FILE_STORAGE_ROOT="/var/lib/wenti-storage"
SOFFICE_PATH="/usr/bin/soffice"
FFMPEG_PATH="/usr/bin/ffmpeg"
TEMP_FILE_RETENTION_HOURS="24"
ORPHAN_PREVIEW_RETENTION_DAYS="7"
TUTORIAL_INLINE_IMAGE_RETENTION_HOURS="24"

# 可选：将资料中心文件和志愿时长证明材料存入私有 OSS。
OSS_BUCKET="wenti-resource"
OSS_REGION="oss-cn-chengdu"
OSS_ENDPOINT="https://oss-cn-chengdu-internal.aliyuncs.com"
OSS_PUBLIC_ENDPOINT="https://oss-cn-chengdu.aliyuncs.com"
OSS_PREFIX="resource-center"
OSS_CREDENTIAL_TYPE="access_key"
OSS_ACCESS_KEY_ID="RAM_USER_ACCESS_KEY_ID"
OSS_ACCESS_KEY_SECRET="RAM_USER_ACCESS_KEY_SECRET"
```

OSS 配置必须成套提供；未配置时资料中心文件和志愿时长证明材料继续使用本地存储。`OSS_ENDPOINT` 供同地域服务器上传和预览读取，`OSS_PUBLIC_ENDPOINT` 仅用于给已通过网站权限检查的用户签发 5 分钟下载地址。AccessKey 必须属于最小权限 RAM 程序用户，不得使用主账号密钥。

升级已有站点时，新上传资料和证明材料会直接进入 OSS，历史本地资料和证明材料仍可访问。要迁移历史资料，必须先同时备份 MySQL 和 `FILE_STORAGE_ROOT`，再按顺序执行：

```bash
cd /opt/wenti
sudo -u wenti npm run storage:migrate-resources-to-oss:dry-run
sudo -u wenti npm run storage:migrate-resources-to-oss
```

脚本会先上传并核对文件大小，然后更新 `FileResource` 中的 Key；不会删除本地原文件，便于观察期回退。

设置权限：

```bash
sudo chown wenti:wenti /opt/wenti/.env.production
sudo chmod 600 /opt/wenti/.env.production
```

检查文件存在但不要打印内容：

```bash
sudo -u wenti test -r /opt/wenti/.env.production
sudo -u wenti test -r /var/lib/wenti-storage
sudo -u wenti test -w /var/lib/wenti-storage
```

当前代码不会使用 `.env.example` 中的 `NEXTAUTH_SECRET` 和 `NEXTAUTH_URL` 完成会话签名；仅填写这两个变量不能解决公网会话安全问题。

## 8. 迁移文件存储

如果是迁移部署，必须同时复制旧 `FILE_STORAGE_ROOT`。建议先停止旧站写入，再执行：

```bash
rsync -aH --info=progress2 /旧服务器/资料库存储目录/ user@新服务器:/var/lib/wenti-storage/
```

可以不复制 `temp/`，但必须保留以下业务目录：

```text
originals/
previews/
hour-proofs/
task-proofs/
proof-previews/
```

迁移完成后：

```bash
sudo chown -R wenti:wenti /var/lib/wenti-storage
sudo chmod 750 /var/lib/wenti-storage
sudo -u wenti test -r /var/lib/wenti-storage
sudo -u wenti test -w /var/lib/wenti-storage
```

## 9. 安装依赖、迁移与构建

依次执行，任何一步失败都停止：

```bash
cd /opt/wenti
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npx prisma migrate deploy
sudo -u wenti npx prisma migrate status
sudo -u wenti npm run build
```

预期：

- `npm ci` 使用项目锁文件安装依赖。
- Prisma Client 成功生成。
- 所有迁移状态为 applied/up to date。
- Next.js 生产构建成功，无 TypeScript 错误。

### 关于初始化账号

- 迁移已有数据时，使用旧数据库中的账号。
- 全新空数据库不会自动产生可登录账号。
- `npm run db:seed` 会先清空业务表，再创建测试账号，只允许在明确的全新测试环境运行。
- 如果全新正式环境没有初始管理员，部署 AI 必须停止并询问项目所有者：导入已有管理员数据库，或明确授权在空库执行 seed 后立即修改/删除全部测试账号。不得自行选择。

## 10. 首次本机启动验证

先临时启动，确认应用能访问数据库和文件目录：

```bash
cd /opt/wenti
sudo -u wenti npm run start -- -p 3000
```

另开终端验证：

```bash
curl -I http://127.0.0.1:3000/login
curl -I http://127.0.0.1:3000/admin/login
curl -I http://127.0.0.1:3000/volunteer/login
```

确认返回正常 HTTP 响应后停止临时进程，再配置 systemd。

## 11. 配置 systemd

先取得 npm 的真实路径：

```bash
command -v npm
```

创建 `/etc/systemd/system/wenti.service`，如果 npm 不在 `/usr/bin/npm`，替换 `ExecStart`：

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

启用并检查：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now wenti
sudo systemctl status wenti --no-pager
sudo journalctl -u wenti -n 100 --no-pager
curl -I http://127.0.0.1:3000/login
```

服务日志中不得出现数据库连接失败、Prisma schema 不匹配、存储目录无权限或 FFmpeg/LibreOffice 找不到等错误。

## 12. 配置 Nginx

创建 `/etc/nginx/sites-available/wenti`：

```nginx
server {
    listen 80;
    server_name volunteer.example.edu.cn;

    client_max_body_size 520m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 1800s;
        proxy_read_timeout 1800s;
        proxy_request_buffering off;
    }
}
```

把示例域名替换为真实域名，然后启用：

```bash
sudo ln -s /etc/nginx/sites-available/wenti /etc/nginx/sites-enabled/wenti
sudo nginx -t
sudo systemctl reload nginx
curl -I http://volunteer.example.edu.cn/login
```

如果软链接已经存在，不要重复创建；先检查它是否指向正确文件。

## 13. 配置 HTTPS

公网部署必须启用 HTTPS：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d volunteer.example.edu.cn
sudo nginx -t
sudo systemctl reload nginx
curl -I https://volunteer.example.edu.cn/login
```

防火墙只开放必要端口：

- 22：仅可信管理来源
- 80：用于跳转 HTTPS 和证书验证
- 443：网站访问
- 3306 和 3000：不得直接暴露公网

## 14. 部署后业务验收

至少使用真实浏览器逐项验证：

### 登录与权限

- 超级管理员、部门负责人和志愿者从各自入口登录。
- 不同角色不能访问无权限页面或附件。
- 深色、浅色和跟随系统模式正常。
- 手机宽度 320 px 和 390 px 下导航、表单和卡片没有横向溢出。

### 志愿时长

- 志愿者能提交日期、时间、时长和拖拽证明附件。
- 图片证明被转为 1080p 以内 JPG。
- 管理员能悬浮预览、通过、驳回和批量通过。
- 驳回后证明原文件与预览文件被删除。
- 已通过记录再次驳回后累计时长正确扣除。
- 某月和全部 Excel 均可下载，列仅包含姓名、学号、总志愿时长。

### 课表

- 志愿者能上传学校导出的 `.xls`/`.xlsx`，重新上传可替换。
- 管理员能看到已录入和未录入人员，并进入个人课表。
- 日期、时间点、姓名/学号、专业和班级可以组合筛选。
- 只选择日期时红/黄/绿时间线、关键刻度和悬停/点按时间正常。

### 资料与教程

- 资料中心创建项目、上传、下载、搜索文件名、按日期筛选、移动和删除正常。
- 图片、视频和 Office 预览能在新标签页打开。
- 教程可保存草稿、发布、上传附件、删除；正文工具栏可设置字体、字号、粗体、斜体、下划线、删除线并在光标处插图，当前光标或后续输入正在使用的格式按钮和颜色色块会保持选中提示。文字颜色只提供默认、蓝、绿、橙、红、紫六项，默认色随深浅模式切换，其余强调色也分别适配黑白背景，不允许任意取色；正文图片能在志愿者端显示；存在未保存内容时离开页面会提示。
- 教程正文图片单张超过 20 MB 或每篇超过 30 张时会拒绝保存；图片落盘后为 1080p 范围内 JPG，删除教程或移除图片后磁盘文件同步删除。

### 账号与消息

- 消息一键已读正常。
- 超级管理员删除账号时，“保留信息”和“连带删除”两种模式符合预期。
- 特长词云点击后能展示对应同学，志愿者端不泄露学号和联系方式。
- 超级管理员能在“系统设置”编辑、开启和关闭全站悬浮公告；公告在管理员端、志愿者端和登录页出现，用户关闭后刷新页面会再次出现。

## 15. 常见故障定位

### 应用无法连接数据库

```bash
sudo systemctl status mysql --no-pager
cd /opt/wenti
sudo -u wenti npx prisma migrate status
sudo journalctl -u wenti -n 200 --no-pager
```

检查 `DATABASE_URL`、密码 URL 编码、数据库用户来源地址和权限。

### 上传时报未配置存储目录

```bash
sudo systemctl cat wenti
sudo -u wenti test -r /var/lib/wenti-storage
sudo -u wenti test -w /var/lib/wenti-storage
sudo journalctl -u wenti -n 200 --no-pager
```

### Office 或视频无法预览

```bash
sudo -u wenti /usr/bin/soffice --headless --version
sudo -u wenti /usr/bin/ffmpeg -version
fc-list :lang=zh | head
sudo journalctl -u wenti -n 200 --no-pager
```

### Nginx 返回 413

确认 `client_max_body_size 520m;` 生效：

```bash
sudo nginx -T | grep client_max_body_size
sudo nginx -t
sudo systemctl reload nginx
```

### 修改代码后页面仍是旧版本

```bash
cd /opt/wenti
sudo systemctl stop wenti
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npx prisma migrate deploy
sudo -u wenti npm run build
sudo systemctl start wenti
sudo systemctl status wenti --no-pager
```

不要在未确认目标路径时运行递归删除命令。

## 16. 更新与回滚

### 常规更新

完整发布链路分为两段：开发机先验证并推送，服务器再拉取同一个提交、构建、重启和验收。

开发机发布前执行：

```bash
cd /Users/qmac/Documents/Program/wenti
npm run build
git status --short
git add <本次改动文件>
git commit -m "说明本次改动"
git push origin main
git rev-parse --short HEAD
```

记录最后输出的提交号，服务器更新后用它核对版本。不要提交 `.env*`、数据库备份、上传目录、`node_modules/` 或 `.next/`。

服务器更新前先备份数据库、存储和当前代码版本：

```bash
cd /opt/wenti
sudo -u wenti git rev-parse --short HEAD
mysqldump --single-transaction -u wenti_app -p wenti_center > wenti-before-update.sql
rsync -aH /var/lib/wenti-storage/ /安全备份目录/wenti-storage/
```

先只读检查远端和服务器工作区：

```bash
cd /opt/wenti
sudo -u wenti git fetch origin
sudo -u wenti git status -sb
sudo -u wenti git rev-parse --short HEAD
sudo -u wenti git rev-parse --short origin/main
```

如果 `git status -sb` 显示服务器有未提交改动，立即停止并报告，不要用 `reset --hard`、`checkout --` 或强制覆盖。确认可以更新后执行：

```bash
cd /opt/wenti
sudo systemctl stop wenti

sudo -u wenti git pull --ff-only origin main
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npx prisma migrate deploy
sudo -u wenti npx prisma migrate status
sudo -u wenti npm run build
```

只有以上步骤全部成功，才启动服务：

```bash
sudo systemctl start wenti
sudo systemctl status wenti --no-pager
curl -I http://127.0.0.1:3000
sudo journalctl -u wenti -n 80 --no-pager
sudo -u wenti git rev-parse --short HEAD
```

最后用浏览器完成业务验收：

- 三类账号能从各自入口登录。
- 新建浏览器标签页访问 `/` 和 `/login` 时首屏样式完整；站点会在 Next.js 样式资源失效时自动绕过旧 HTML 缓存重载一次，持续网络故障不会形成刷新循环。
- 志愿者可以提交志愿时长申请，申请表只需填写日期，不需要具体开始/结束时间。
- 辅助证明材料可以上传、下载、预览；启用 OSS 时，新证明材料进入 OSS，历史本地证明仍可访问。
- 部门负责人可以审核通过/驳回志愿时长，驳回会清理对应证明附件和预览产物。
- 资料中心文件上传、下载、图片/视频/Office 预览正常。
- 课表上传、管理员空闲筛选、志愿时长 Excel 导出正常。

Office 预览 PDF 按需生成并保留 7 天。部署后先检查清理结果，再为 `wenti` 用户配置每天一次的定时清理：

```bash
cd /opt/wenti
sudo -u wenti node --env-file=.env.production scripts/cleanup-storage.mjs --dry-run
sudo crontab -u wenti -e
```

在 crontab 中加入：

```cron
20 3 * * * cd /opt/wenti && /usr/bin/node --env-file=.env.production scripts/cleanup-storage.mjs
```

如需调整保存时间，可在 `.env.production` 设置 `OFFICE_PREVIEW_RETENTION_DAYS`，默认值为 `7`。

如果本次只改了页面样式或交互，`npm ci` 和 `prisma migrate deploy` 通常不会产生实质变化，但保留执行可以减少“忘了跑一步”的事故。若 `git pull --ff-only` 提示无法快进，说明远端和服务器代码历史不一致，应停止并确认，不要在生产环境直接 merge 或 rebase。

### 回滚原则

- 代码、数据库和文件存储必须回到相互匹配的同一备份时间点。
- Prisma 已执行的迁移不要手工从迁移表删除。
- 不要用 `migrate reset` 回滚生产数据库。
- 如果迁移不可逆，应恢复数据库备份，再恢复对应代码和存储备份。
- 回滚后重新执行登录、附件、课表和志愿时长验收。

## 17. 交付给 AI 的最短提示词

可以把以下内容连同项目文件交给部署 AI：

```text
请先完整阅读 README_DEPLOY.md 和 README_FULL.md。目标是在 Ubuntu 服务器上将本项目部署到 /opt/wenti，持久化目录为 /var/lib/wenti-storage，使用 MySQL 8、systemd、Nginx 和 HTTPS。先只做服务器预检并报告结果，不要立即修改系统。确认部署模式（新环境或迁移）、域名、数据库来源、初始管理员来源和公网/内网范围后，再按 README_DEPLOY.md 逐阶段执行。禁止在已有数据环境运行 seed、migrate dev、db push、migrate reset，禁止覆盖已有数据库、存储、Nginx 或 systemd 配置。每一步失败都停止并报告，部署完成后执行文档中的完整业务验收。
```

## 18. 最终交付信息

部署 AI 完成后应向用户提供：

- 网站正式访问地址
- 部署模式和完成时间
- Node.js、MySQL、Prisma 迁移版本状态
- systemd 服务状态和 Nginx/HTTPS 状态
- 应用目录与存储目录
- 数据库和文件备份位置
- 已验证的业务清单
- 未完成的安全项或已知问题
- 后续更新与查看日志的命令

不要在交付信息中包含明文密码、数据库连接字符串、Cookie、私钥或管理员初始密码。
