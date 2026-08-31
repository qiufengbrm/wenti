# 资料中心移动端、打包下载与 500MB 上传补丁

这是一个可直接交给云服务器 AI 执行的增量补丁，适用于当前部署在 `/opt/wenti`、由 `wenti.service` 运行、应用监听 `3100` 的网站。

补丁不修改 Prisma Schema、数据库记录、附件存储内容、环境变量、登录安全代码或 systemd 服务。它会增加 ZIP 打包依赖，因此必须执行 `npm ci`；资料中心上传上限改为 500MB，因此必须把 Nginx 请求体上限同步改为 `520m`。不需要数据库迁移或 seed。

## 修复与新增内容

- 手机端进入活动项目或文件夹后使用独立触控卡片，320px 与 390px 下不产生页面级横向溢出。
- 空间不足时按“下载/管理操作 → 完整文件大小 → 文件名”的顺序保留信息；过长文件名用省略号截断。
- 手机端搜索、日期筛选、面包屑、上传、新建文件夹和批量工具栏重新排布。
- 文件夹可直接打包下载，ZIP 包含该文件夹下全部可访问的本地文件和子目录。
- 志愿者和管理员都可勾选多个文件或文件夹后批量下载；管理员原有批量移动、删除能力不变。
- ZIP 使用流式生成，不会先把整个压缩包塞进 Node.js 内存；单次最多选择 200 项、最多打包 10000 个文件和文件夹。
- 项目页增加提示：Office 文件预览会自动转换为 PDF，排版和格式可能变化。
- 资料中心上传区第二行只显示“最多 100MB”，但前端和接口仍执行 500MB 硬限制；100MB 至 500MB 的文件可以正常上传。
- 资料中心主页增加告示：服务器最大上传和下载速率约为 1–2 MB/s。该告示只说明服务器现状，不额外进行限速。
- 教程附件仍保持 100MB 上限，不受资料中心上限调整影响。

## 补丁涉及文件

```text
package.json
package-lock.json
src/components/files/ResourceDrive.tsx
src/lib/resource-storage.ts
src/lib/tutorial-form.ts
src/app/api/resources/upload/route.ts
src/lib/resource-archive.ts                         （新增）
src/app/api/resources/download/route.ts             （新增）
src/app/api/resources/folders/[id]/download/route.ts（新增）
```

补丁文件：

```text
mobile-resource-project-ui.patch
SHA-256: 3b312e11c022d4c804034066d7f0fbfc7c0525265cfb29ab0ec55b00df9c1b5f
```

把整个 `mobile-resource-project-ui` 目录上传到服务器，例如：

```text
/root/mobile-resource-project-ui/
```

## 给云服务器 AI 的执行要求

先只读检查，不要直接应用：

```bash
cd /opt/wenti
test -f package.json
test -f package-lock.json
test -f src/components/files/ResourceDrive.tsx
test -f /root/mobile-resource-project-ui/mobile-resource-project-ui.patch
sha256sum /root/mobile-resource-project-ui/mobile-resource-project-ui.patch
patch --dry-run -p1 < /root/mobile-resource-project-ui/mobile-resource-project-ui.patch
```

SHA-256 必须与本 README 一致，且 `patch --dry-run` 必须完全成功。若出现 `Reversed (or previously applied) patch`，可能已经应用过旧版或本版补丁；若出现 `hunk failed`，说明服务器代码与补丁基线不同。两种情况都应停止并检查，禁止使用 `--force`。

如果服务器已经应用过 SHA-256 为 `20633b3a311c3757d8d456733787d9c5fa6710632934b3072b4b24a489192426` 的旧版纯 UI 补丁，应先用当时备份恢复旧版 `ResourceDrive.tsx`，再对本补丁执行 dry-run。本补丁已经完整包含旧版 UI 修复，不要把两个补丁叠加。

## 备份与应用

先备份本次会覆盖的原文件；时间戳可按部署时间修改：

```bash
cd /opt/wenti
sudo tar -czf /root/wenti-before-resource-patch-20260831.tar.gz \
  package.json package-lock.json \
  src/components/files/ResourceDrive.tsx \
  src/lib/resource-storage.ts \
  src/lib/tutorial-form.ts \
  src/app/api/resources/upload/route.ts
```

然后执行：

```bash
sudo systemctl stop wenti
cd /opt/wenti
sudo -u wenti patch -p1 < /root/mobile-resource-project-ui/mobile-resource-project-ui.patch
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npx tsc --noEmit
sudo -u wenti npm run lint
sudo -u wenti npm run build
```

更新当前站点对应的 Nginx `server` 块：

```nginx
client_max_body_size 520m;
```

检查并重新加载：

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl start wenti
sudo systemctl status wenti --no-pager
curl -I http://127.0.0.1:3100/volunteer/files
```

本补丁不要执行：

```text
prisma migrate dev
prisma migrate deploy
prisma db push
npm run db:seed
```

## 上线验收

使用志愿者账号和管理员账号分别检查：

1. 资料中心主页能看到“服务器最大上传和下载速率约为 1–2 MB/s”的告示。
2. 手机浏览器进入项目和二级文件夹，320px、390px 下页面不能整体横向滚动。
3. 卡片右侧下载和管理按钮完整可点，文件大小完整显示；长文件名以省略号结束。
4. 勾选一个或多个文件、文件夹后能看到“批量下载”；志愿者不能看到管理员专属的移动和删除。
5. 直接下载文件夹与批量下载均得到有效 ZIP，解压后目录层级和文件完整。
6. 项目内能看到 Office 自动转 PDF、格式可能变化的提醒。
7. 上传弹窗第二行只显示“最多 100MB”；100MB 至 500MB 的资料仍可上传，超过 500MB 的资料被拒绝。
8. 教程附件仍按 100MB 限制。
9. 桌面端大小列和下载/操作列优先显示，上传人、更新时间在较窄窗口隐藏，文件名按剩余空间省略。
10. 管理员原有新建文件夹、拖拽移动、批量移动、批量删除和悬停预览均正常。
11. 浅色、深色和跟随系统模式下文字、边框与提示均清晰。

大文件验收时还要确认公网 Nginx 没有返回 413，并预留足够传输时间：服务器速率为 1–2 MB/s 时，500MB 文件本来就可能需要数分钟。

## 回滚

如果安装、构建或验收失败：

```bash
sudo systemctl stop wenti
cd /opt/wenti
sudo tar -xzf /root/wenti-before-resource-patch-20260831.tar.gz -C /opt/wenti
sudo rm -f src/lib/resource-archive.ts \
  src/app/api/resources/download/route.ts \
  'src/app/api/resources/folders/[id]/download/route.ts'
sudo -u wenti npm ci
sudo -u wenti npx prisma generate
sudo -u wenti npm run build
sudo systemctl start wenti
sudo systemctl status wenti --no-pager
```

随后把 Nginx 的 `client_max_body_size` 恢复为应用补丁前的值并运行 `sudo nginx -t && sudo systemctl reload nginx`。回滚不得覆盖 `.env.production`、数据库或 `/var/lib/wenti-storage`。

## 可直接复制给云服务器 AI 的提示词

```text
请完整阅读 /root/mobile-resource-project-ui/README.md。先在 /opt/wenti 验证补丁 SHA-256 并执行 patch --dry-run -p1；失败就停止，禁止 --force。成功后按 README 备份指定文件、停止 wenti.service、应用补丁、执行 npm ci、Prisma generate、TypeScript、lint 和生产构建检查；把当前站点 Nginx 的 client_max_body_size 改为 520m，通过 nginx -t 后 reload，再启动服务。不要执行 seed、db push 或任何数据库迁移。最后用志愿者和管理员账号验证 320px/390px UI、文件名省略、大小和操作优先显示、文件夹 ZIP、批量 ZIP、上传框显示 100MB 但实际硬限制 500MB、100MB 教程附件、Office 预览提醒及主页 1–2 MB/s 告示。
```
