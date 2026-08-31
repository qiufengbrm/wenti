# 消息中心模块 README

本文档记录当前“我的消息 / 消息中心”模块的结构、数据流和维护要点，方便后续继续开发。

## 入口页面

- 管理员消息中心：`/admin/messages`
- 志愿者消息中心：`/volunteer/messages`

两个页面共用同一个组件：

- `src/components/messages/MessageCenter.tsx`

页面负责：

- 校验当前登录角色。
- 从数据库读取消息中心数据。
- 将当前用户角色和消息线程传给 `MessageCenter`。

相关页面文件：

- `src/app/admin/messages/page.tsx`
- `src/app/volunteer/messages/page.tsx`

## 当前 UI 结构

消息中心为三栏结构：

```txt
左侧分类栏
  ├─ 任务消息
  ├─ 消息通告
  └─ 系统消息

中间会话列表
  ├─ 按发送对象 / 通告中心 / 系统消息聚合
  ├─ 显示最近一条预览
  └─ 显示未读红点

右侧消息详情
  ├─ 默认不打开任何会话
  ├─ 点击会话后显示详情
  ├─ 打开后自动滚动到最新消息
  └─ 时间以独立居中时间条显示
```

## 消息分类

前端当前展示三类：

```ts
type MessageCenterCategory = "tasks" | "announcements" | "system";
```

含义：

- `tasks`：任务消息，包括取消申请、取消审核结果、志愿时长申报、申报审核结果。
- `announcements`：消息通告，来自 `Notice` 表。
- `system`：系统消息，例如密码重置、网站维护等。

数据库中 `Message.category` 仍保留更细的枚举：

```prisma
enum MessageCategory {
  APPLICATION
  REPLY
  SYSTEM
}
```

映射关系：

```txt
APPLICATION -> tasks
REPLY       -> tasks
SYSTEM      -> system
Notice      -> announcements
```

## 数据库相关模型

### Message

用于点对点个人消息。

关键字段：

- `receiverId`：接收人。
- `senderId`：发送人，可为空。
- `title`：消息标题。
- `content`：消息正文。
- `category`：消息分类，`APPLICATION` / `REPLY` / `SYSTEM`。
- `status`：`UNREAD` / `READ`。
- `relatedUrl`：相关页面链接。
- `createdAt`：服务端写入时间。
- `readAt`：已读时间。

### Notice

用于公开通告。

通告不会复制到每个用户的 `Message` 表里，而是在消息中心读取时合并展示。

### NoticeRead

用于记录某个用户是否读过某条通告。

## 数据读取

主要读取函数在：

- `src/lib/data.ts`

核心函数：

```ts
getMessageCenterData(userId, role)
```

该函数会：

1. 读取当前用户发送或接收过的 `Message`。
2. 读取当前用户可见的 `Notice`。
3. 将 `Message` 按会话对象聚合。
4. 将 `Notice` 聚合成一个“通告中心”会话。
5. 返回给前端组件展示。

会话结构大致为：

```ts
interface MessageCenterThread {
  id: string;
  category: "tasks" | "announcements" | "system";
  peerId: string;
  peerName: string;
  peerSubline: string;
  preview: string;
  unreadCount: number;
  updatedAt: number;
  lastTimestamp: number;
  items: MessageCenterItem[];
}
```

消息详情结构大致为：

```ts
interface MessageCenterItem {
  id: string;
  source: "message" | "notice";
  title: string;
  content: string;
  date: string;
  timestamp: number;
  status: string;
  direction: "sent" | "received";
  relatedUrl: string;
}
```

## 时间规则

时间不在前端根据浏览器本机时间判断。

当前做法：

- 数据库中的 `createdAt` 由服务端生成。
- `src/lib/data.ts` 中用 `formatDateTime()` 在服务端格式化。
- 前端只展示服务端传来的 `date` 字符串。

消息详情中的时间显示方式：

- 不嵌入消息气泡。
- 独立居中显示，类似微信聊天时间条。

## 已读与未读

### 右上角未读红点

右上角铃铛组件：

- `src/components/layout/MessageBell.tsx`

当前逻辑：

- 初始未读数由服务端 `getUnreadMessageCount(user.id)` 提供。
- 点击消息会话后，通过浏览器事件即时扣减。
- 每 10 秒请求一次接口同步未读数。
- 浏览器窗口重新聚焦时也会同步一次。

接口：

```txt
GET /api/messages?mode=unread-count
```

返回：

```json
{ "count": 1 }
```

### 点击会话后的已读逻辑

前端点击某个会话后：

1. 本地立刻清掉该会话未读数。
2. 触发 `wenti:messages-read` 事件，让右上角红点即时减少。
3. 调用：

```txt
PATCH /api/messages
```

请求体：

```json
{
  "category": "tasks",
  "peerId": "u_admin_1"
}
```

后端会：

- 对 `tasks` 分类，把对应用户发来的 `APPLICATION` 和 `REPLY` 消息都标为已读。
- 对 `system` 分类，把系统消息标为已读。
- 对 `announcements` 分类，写入或更新 `NoticeRead`。

## 自动消息模板

自动消息主要由任务相关 API 创建。

相关 API：

- `src/app/api/tasks/[id]/cancel/route.ts`
- `src/app/api/tasks/[id]/submit/route.ts`
- `src/app/api/tasks/[id]/review/route.ts`
- `src/app/api/tasks/[id]/cancel-review/route.ts`

### 取消申请

志愿者提交取消申请后，发给部门负责人：

```txt
标题：取消申请

申请人：xxx
项目：xxx
原因：xxx
```

### 取消申请审核结果

部门负责人同意：

```txt
标题：取消申请已同意

项目：xxx
```

部门负责人不同意：

```txt
标题：取消申请未同意

项目：xxx
说明：请按时参加任务
```

### 志愿时长申报

志愿者完成任务并申报时长后，发给部门负责人：

```txt
标题：志愿时长申报

提交人：xxx
项目：xxx
申报时长：x 小时
说明：xxx
```

### 志愿时长审核结果

部门负责人同意：

```txt
标题：志愿时长申报已同意

项目：xxx
申报时长：x 小时
```

部门负责人不同意：

```txt
标题：志愿时长申报未同意

项目：xxx
原因：xxx
```

## 历史消息兼容

部分旧测试数据使用过早期文案，例如：

- `新的取消任务申请`
- `任务工时审核通过`
- `完成证明被驳回`

为了避免旧数据展示不一致，`src/lib/data.ts` 中的 `getMessageDisplayText()` 会在服务端做兼容转换，把旧消息展示成当前模板。

## 当前注意事项

1. 测试数据不要使用未来时间。

   如果种子数据里的 `createdAt` 晚于当前服务器时间，新创建的消息会被排到未来消息后面，看起来像“没有通知”。当前 `prisma/seed.mjs` 已修正过这一点。

2. 消息红点不是 WebSocket。

   当前使用轻量轮询：

   - 每 10 秒同步一次。
   - 页面重新聚焦时同步一次。
   - 点击已读时本地即时扣减。

   后续如果需要更实时，可以接 WebSocket、SSE 或 Pusher 类服务。

3. 通告不是个人消息。

   通告来自 `Notice` 表，在消息中心中作为“通告中心”合并展示；已读状态由 `NoticeRead` 管理。

4. 文件附件目前只存元数据。

   如果后续消息支持附件，应沿用当前文件策略：数据库只存 URL、文件名、类型、大小，不直接存二进制文件。

## 常用验证方式

运行检查：

```bash
npm run lint
npm run build
```

如果当前 shell 找不到 `npm`，可以使用本机项目已用的 Node 路径：

```bash
/Users/qmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/next/dist/bin/next lint
/Users/qmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/next/dist/bin/next build
```

查看最近消息：

```sql
SELECT title, receiverId, senderId, category, status, createdAt, content
FROM Message
ORDER BY createdAt DESC
LIMIT 10;
```

查看某个用户未读消息：

```txt
GET /api/messages?mode=unread-count
```
