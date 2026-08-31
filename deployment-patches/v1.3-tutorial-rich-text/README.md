# v1.3 教程富文本与正文插图补丁

本补丁以**已经成功部署 v1.2 全站悬浮公告**的代码和数据库为前置版本，适用于当前部署在 `/opt/wenti`、由 `wenti.service` 运行的网站。它不会重复安装或修改 v1.2 功能。

## 新增功能

- 教程正文支持字体、字号、有限强调色、加粗、斜体、下划线和删除线。默认文字随深浅模式自动切换黑/白，颜色菜单只保留蓝、绿、橙、红、紫五组双主题适配色，不能任意取色。
- 加粗、斜体、下划线、删除线和颜色按钮会随光标位置及当前输入状态实时显示 Office 式选中提示。
- 图片可以插入当前光标位置，不再只能作为文末附件。
- 正文图片单张最大 20 MB，每篇教程最多 30 张；图片统一转成最长边不超过 1920×1080 范围的 JPG。
- 正文图片跟随教程权限：未保存图片仅上传者可见；已发布教程按原有可见范围展示。
- 删除教程、从正文移除图片后，会同步删除对应 JPG；上传后 24 小时仍未保存的图片由存储清理脚本回收。
- 旧教程保持兼容：迁移后标记为 `PLAIN`，首次编辑保存时自动转为安全富文本。
- 服务端使用白名单清洗正文 HTML，脚本、事件属性和外站图片地址不会被保存或渲染。
- 工具栏适配手机端自动换行，主要按钮保留足够触控区域，并兼容浅色、深色和跟随系统模式。

补丁新增 npm 包：`sanitize-html` 和类型声明。补丁新增一条 Prisma 迁移，只增加 `Tutorial.contentFormat` 字段和 `TutorialInlineImage` 表，不删除或重写现有教程、账号、附件及业务记录。

## 补丁文件

```text
v1.3-tutorial-rich-text.patch
SHA-256: 6ca47607c54732fbcc6f4b094a04f0c249d4a3e66e3803b53e1485dbaa4c0044
```

建议把本目录完整上传到：

```text
/root/v1.3-tutorial-rich-text/
```

## 应用前只读检查

先确认 v1.2 已经存在，再检查补丁：

```bash
cd /opt/wenti
test -f prisma/migrations/20260831150000_floating_announcement/migration.sql
sudo -u wenti npx prisma migrate status
sha256sum /root/v1.3-tutorial-rich-text/v1.3-tutorial-rich-text.patch
sudo -u wenti mkdir -p \
  prisma/migrations/20260831170000_tutorial_rich_text \
  src/app/api/tutorial-images/'[id]'
patch --dry-run -p1 < /root/v1.3-tutorial-rich-text/v1.3-tutorial-rich-text.patch
```

SHA-256 必须与本文一致，`prisma migrate status` 应显示 v1.2 及之前迁移均正常，dry-run 必须完全成功。出现 `Reversed (or previously applied) patch`、`hunk failed` 或数据库迁移漂移时立即停止，不得使用 `--force`。

## 备份

停止写入前先准备备份目录：

```bash
sudo mkdir -p /root/wenti-v1.3-backup
sudo chmod 700 /root/wenti-v1.3-backup
```

备份本次会修改的现有代码：

```bash
cd /opt/wenti
sudo tar -czf /root/wenti-v1.3-backup/code-before-v1.3.tar.gz \
  package.json package-lock.json .env.example README.md README_DEPLOY.md \
  prisma/schema.prisma scripts/cleanup-storage.mjs \
  src/components/tutorials/TutorialEditorForm.tsx \
  src/lib/tutorial-form.ts src/lib/data.ts \
  src/app/api/tutorials/route.ts \
  src/app/api/tutorials/'[id]'/route.ts \
  src/app/volunteer/tutorials/'[id]'/page.tsx
```

正式备份前开启 v1.2 维护公告并停止服务，避免数据库和图片目录在备份中途继续变化：

```bash
sudo systemctl stop wenti
```

再按服务器现有安全流程备份 MySQL 和完整 `FILE_STORAGE_ROOT`。下面是示例，数据库密码不要写进聊天或命令参数：

```bash
mysqldump --single-transaction --quick --routines --triggers \
  --no-tablespaces --default-character-set=utf8mb4 \
  -h 127.0.0.1 -P 3306 -u 数据库备份账号 -p 数据库名 \
  > /root/wenti-v1.3-backup/database-before-v1.3.sql
test -s /root/wenti-v1.3-backup/database-before-v1.3.sql
sudo rsync -aH /var/lib/wenti-storage/ /root/wenti-v1.3-backup/storage-before-v1.3/
sudo chmod -R go-rwx /root/wenti-v1.3-backup
```

数据库和文件存储备份必须来自同一个停写时间点；确认两份备份都成功后再继续。

## 正式应用

```bash
sudo systemctl stop wenti
cd /opt/wenti
sudo -u wenti patch -p1 < /root/v1.3-tutorial-rich-text/v1.3-tutorial-rich-text.patch
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npx prisma migrate deploy
sudo -u wenti npx prisma migrate status
sudo -u wenti npx prisma validate
sudo -u wenti npx tsc --noEmit
sudo -u wenti npm run lint
sudo -u wenti npm run build
sudo systemctl start wenti
sudo systemctl status wenti --no-pager
sudo journalctl -u wenti -n 150 --no-pager
```

严禁执行：

```text
prisma migrate dev
prisma db push
prisma migrate reset
npm run db:seed
手工修改或删除 _prisma_migrations 记录
```

本补丁不要求修改 Nginx、systemd 或现有上传上限。正文图片限制为 20 MB，低于当前资料中心使用的反向代理上限。`TUTORIAL_INLINE_IMAGE_RETENTION_HOURS` 可不配置，默认 24；如需显式配置，可在 `.env.production` 增加：

```dotenv
TUTORIAL_INLINE_IMAGE_RETENTION_HOURS="24"
```

如果修改了环境文件，执行 `sudo systemctl restart wenti` 使其生效，且不要在日志或聊天中打印环境文件内容。

## 上线验收

1. 用部门负责人或 Superadmin 登录，进入“教程管理”并新建教程。
2. 输入正文，分别测试字体、字号、五种强调色、加粗、斜体、下划线和删除线；开启加粗后继续输入时按钮应保持高亮，关闭后熄灭，移动光标到已有格式文字时相应按钮应自动点亮，颜色色块同理。保存草稿后重新打开，格式仍保留。切换浅色、深色和跟随系统模式，默认文字及强调色均应保持清晰。
3. 将光标放在两段文字中间插入 JPG/PNG，图片应出现在光标处；保存后重新编辑仍正常。
4. 发布教程，用志愿者账号打开教程详情，文字排版和正文图片可见，且页面无横向溢出。
5. 在 320 px、390 px 和桌面宽度检查工具栏换行、按钮触控、编辑区和教程详情；同时检查浅色、深色、跟随系统模式。
6. 上传超过 20 MB 的正文图片应被拒绝；一篇教程超过 30 张图片应无法保存。
7. 从正文删除一张图片后保存，再确认该图片接口不再可访问；删除整篇教程后，正文图片和普通附件均被清理。
8. 创建一个旧版纯文本教程的副本或选择现有旧教程，确认详情仍按换行显示；进入编辑页后能正常转成段落并保存。
9. 用正文粘贴包含 `<script>`、`onerror` 或外站图片 URL 的测试内容，保存后检查危险内容未被保留。不要在正式教程中保留这条测试数据。
10. 执行 `sudo -u wenti npm run storage:cleanup:dry-run`，输出中应包含 `abandonedTutorialImages`，dry-run 不应删除文件。
11. 检查 `sudo journalctl -u wenti -n 200 --no-pager`，不得出现 Prisma 字段缺失、图片目录权限或 FFmpeg 错误。

正文图片压缩依赖现有 FFmpeg。若插图失败，检查：

```bash
sudo -u wenti /usr/bin/ffmpeg -version
sudo -u wenti test -r /var/lib/wenti-storage
sudo -u wenti test -w /var/lib/wenti-storage
sudo journalctl -u wenti -n 200 --no-pager
```

## 回滚

如果迁移尚未执行，仅恢复代码备份并删除本补丁新增文件即可。

如果迁移已经执行，完整回滚必须在维护窗口内同时恢复**补丁前代码、补丁前数据库和同一时间点的文件存储备份**。不要尝试用 `migrate reset`、`db push` 或手工删除 `_prisma_migrations` 回滚。

紧急情况下可以只恢复旧页面代码并保留新增表、迁移目录和当前 Schema，但富文本教程会退化成显示 HTML 源码，因此只适合临时止血，不算完整业务回滚。恢复后必须重新运行 `npm ci`、`prisma generate`、生产构建并完成教程验收。

## 可直接复制给云服务器 AI 的提示词

```text
v1.2 已经部署完成，现在只应用 v1.3。请完整阅读 /root/v1.3-tutorial-rich-text/README.md。先确认 /opt/wenti 中存在 v1.2 迁移、验证补丁 SHA-256、检查 prisma migrate status，并执行 patch --dry-run -p1；任何一步失败都停止，禁止 --force。随后开启现有 v1.2 维护公告，停止 wenti.service，按 README 备份代码、MySQL 和同一时间点的 /var/lib/wenti-storage，再应用补丁。依次执行 npm ci、prisma generate、prisma migrate deploy、migrate status、prisma validate、TypeScript、lint、生产构建，成功后启动服务。禁止 seed、migrate dev、db push、migrate reset 和手工修改迁移记录，不修改 Nginx 或 systemd。最后按 README 使用管理员、志愿者、旧教程、正文插图、格式工具、危险 HTML、手机宽度、深浅模式、清理脚本 dry-run 和日志清单验收；全部通过后关闭维护公告。
```
