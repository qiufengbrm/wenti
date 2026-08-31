# v1.2 全站悬浮公告补丁

本补丁为 Superadmin 增加全站临时公告控制台，适用于部署在 `/opt/wenti`、由 `wenti.service` 运行的当前网站。

补丁包含一条新增数据库表迁移，因此必须执行 `prisma generate` 和 `prisma migrate deploy`。迁移只新增 `FloatingAnnouncement` 表，不修改或删除任何现有业务表、用户、附件和历史数据；默认总开关为关闭，不会在刚部署完成时突然向用户弹公告。

## 功能说明

- Superadmin 在“系统设置”中自定义最多 500 字的公告内容。
- Superadmin 可以打开或关闭全站公告总开关，并在保存前查看实际样式预览。
- 公告悬浮在管理员端、志愿者端和登录页顶部，不挤压原页面布局。
- 用户可以点击关闭按钮关闭当前页面中的公告。
- 用户关闭后进行站内跳转不会重复出现；刷新、重新打开网页或新开标签页时，只要总开关仍开启，公告会再次出现。
- 页面每 30 秒检查一次公告状态。已经打开网站的用户无需刷新，也能在管理员发布或关闭后收到变化。
- Superadmin 在当前页面保存公告后立即生效，无需等待下一次检查。
- 关闭按钮保持 44×44px 触控面积，公告适配 320px 手机、安全区、浅色和深色模式。
- 公告读取接口允许公开读取当前已启用内容；修改接口只允许 Superadmin，普通管理员和志愿者会收到 403。
- 每次开启、关闭或修改保存都会写入现有 `OperationLog` 数据表，方便保留后台审计信息。

## 补丁涉及文件

```text
prisma/schema.prisma
prisma/migrations/20260831150000_floating_announcement/migration.sql（新增）
src/app/layout.tsx
src/app/admin/settings/page.tsx
src/app/api/site-announcement/route.ts                         （新增）
src/components/layout/FloatingAnnouncement.tsx                 （新增）
src/components/settings/SiteAnnouncementSettings.tsx           （新增）
src/lib/floating-announcement.ts                               （新增）
```

补丁文件：

```text
v1.2-floating-announcement.patch
SHA-256: 65cee82531a78167a7b96b98eef748ff791bc2ff4a415826f997c02a216dfe1f
```

建议把整个目录上传到：

```text
/root/v1.2-floating-announcement/
```

## 应用前检查

本补丁以当前 v1.1 之后的代码为基线。先只读检查：

```bash
cd /opt/wenti
test -f prisma/schema.prisma
test -f src/app/layout.tsx
test -f src/app/admin/settings/page.tsx
test -f /root/v1.2-floating-announcement/v1.2-floating-announcement.patch
sha256sum /root/v1.2-floating-announcement/v1.2-floating-announcement.patch
mkdir -p \
  prisma/migrations/20260831150000_floating_announcement \
  src/app/api/site-announcement \
  src/components/settings
patch --dry-run -p1 < /root/v1.2-floating-announcement/v1.2-floating-announcement.patch
```

SHA-256 必须与本 README 一致，且 dry-run 必须完全成功。如果出现 `Reversed (or previously applied) patch` 或 `hunk failed`，立即停止检查代码版本，禁止使用 `--force`。

应用前还要确认数据库当前迁移状态：

```bash
cd /opt/wenti
sudo -u wenti npx prisma migrate status
```

如果现有迁移本来就有失败、漂移或未解释的修改，不要继续应用补丁。

## 备份

先备份本次会修改的原文件：

```bash
cd /opt/wenti
sudo tar -czf /root/wenti-before-v1.2-announcement-20260831.tar.gz \
  prisma/schema.prisma \
  src/app/layout.tsx \
  src/app/admin/settings/page.tsx
```

再按服务器现有安全流程备份 MySQL。下面仅为示例，禁止把密码直接写进聊天或命令历史：

```bash
mysqldump --single-transaction --quick --routines --triggers \
  --no-tablespaces --default-character-set=utf8mb4 \
  -h 127.0.0.1 -P 3306 -u 数据库备份账号 -p 数据库名 \
  > /root/wenti-before-v1.2-announcement-20260831.sql
chmod 600 /root/wenti-before-v1.2-announcement-20260831.sql
```

确认 SQL 备份不是空文件后再继续。

## 应用补丁

```bash
sudo systemctl stop wenti
cd /opt/wenti
sudo -u wenti mkdir -p \
  prisma/migrations/20260831150000_floating_announcement \
  src/app/api/site-announcement \
  src/components/settings
sudo -u wenti patch -p1 < /root/v1.2-floating-announcement/v1.2-floating-announcement.patch
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npx prisma migrate deploy
sudo -u wenti npx tsc --noEmit
sudo -u wenti npm run lint
sudo -u wenti npm run build
sudo systemctl start wenti
sudo systemctl status wenti --no-pager
```

检查新迁移和服务日志：

```bash
cd /opt/wenti
sudo -u wenti npx prisma migrate status
sudo journalctl -u wenti -n 150 --no-pager
curl -I http://127.0.0.1:3100/login
curl -sS http://127.0.0.1:3100/api/site-announcement
```

预期公开接口初始返回 `enabled: false`。本补丁不需要修改 Nginx、systemd、环境变量或附件目录。

严禁执行：

```text
prisma migrate dev
prisma db push
npm run db:seed
手工修改或删除 _prisma_migrations 记录
```

## 上线验收

1. 用 Superadmin 登录，进入“系统设置”。
2. 能看到“全站悬浮公告”开关、公告内容、字数、显示预览和保存按钮。
3. 填写包含明确维护时间的公告，打开开关并保存；页面提示“全站悬浮公告已开启”。
4. 管理员端、志愿者端和 `/login` 页面顶部都出现同一条公告。
5. 点击公告右侧关闭按钮，公告立即消失；继续站内跳转时不重复出现。
6. 刷新页面或新开标签页，公告再次出现。
7. 在 320px 和 390px 手机宽度下不横向溢出，公告文字可换行，关闭按钮完整可点。
8. 浅色、深色和跟随系统模式下公告及设置页文字清晰。
9. 保持另一个用户页面打开；Superadmin 修改公告后，最多 30 秒内显示新内容。
10. Superadmin 关闭总开关并保存，当前页面立即隐藏，其他打开的页面最多 30 秒内隐藏。
11. 使用普通管理员账号请求 `PATCH /api/site-announcement` 应返回 403。
12. 公告关闭后刷新登录页，不能再出现悬浮公告。

验收完成后建议保持总开关关闭，等真正维护前再打开。

## 回滚

若迁移已经成功，最安全的代码回滚方式是只恢复旧版页面入口，保留 `prisma/schema.prisma`、新增迁移目录、新增表和 Prisma 已应用记录。旧页面不会读取这张表：

```bash
sudo systemctl stop wenti
cd /opt/wenti
sudo tar -xzf /root/wenti-before-v1.2-announcement-20260831.tar.gz -C /opt/wenti \
  src/app/layout.tsx \
  src/app/admin/settings/page.tsx
sudo rm -f \
  src/app/api/site-announcement/route.ts \
  src/components/layout/FloatingAnnouncement.tsx \
  src/components/settings/SiteAnnouncementSettings.tsx \
  src/lib/floating-announcement.ts
sudo rmdir src/app/api/site-announcement 2>/dev/null || true
sudo rmdir src/components/settings 2>/dev/null || true
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npm run build
sudo systemctl start wenti
sudo systemctl status wenti --no-pager
```

此时不要恢复旧版 `prisma/schema.prisma`，也不要删除迁移目录或 `_prisma_migrations` 中的记录。如果必须连数据库也恢复到补丁前状态，应在维护窗口内恢复补丁前的完整数据库备份，并确保代码、Schema 和数据库来自匹配版本。

## 可直接复制给云服务器 AI 的提示词

```text
请完整阅读 /root/v1.2-floating-announcement/README.md。先在 /opt/wenti 验证补丁 SHA-256、执行 patch --dry-run -p1，并检查当前 Prisma migrate status；任何一步失败都停止，禁止 --force。确认数据库和列出的代码文件已经备份后，停止 wenti.service，应用 v1.2 补丁，依次执行 npm ci、prisma generate、prisma migrate deploy、TypeScript、lint 和生产构建，再启动服务。不要执行 seed、db push 或 migrate dev，不要修改 Nginx、systemd、环境变量和附件。最后按 README 使用 Superadmin、普通管理员、志愿者、登录页、320px/390px、深浅模式、关闭后刷新重现、30 秒状态同步和普通管理员 PATCH 返回 403 的清单验收；验收结束后把公告总开关保持关闭。
```
