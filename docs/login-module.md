# 登录模块说明

本文档用于让后续维护者或 AI 快速理解“文艺体育中心管理网站”的登录模块结构、当前实现方式和后续接入真实认证时的改造点。

## 当前登录入口

登录模块拆成三个入口：

- `/login`：公共入口选择页，只展示“志愿者入口”和“管理员入口”。
- `/volunteer/login`：志愿者登录页。
- `/admin/login`：部门负责人登录页。
- `/superadmin/login`：超级管理员专用登录页，不在普通页面中放置跳转链接。

根路径 `/` 的行为：

- 未登录时跳转到 `/login`。
- 已登录时根据角色跳转到对应后台。

## 角色与默认跳转

角色定义在 `src/types/role.ts`：

- `super_admin`：超级管理员。
- `admin`：部门负责人。
- `volunteer`：普通志愿者。

默认跳转逻辑在 `src/lib/permissions.ts`：

- `super_admin` -> `/admin`
- `admin` -> `/admin`
- `volunteer` -> `/volunteer`

## 主要文件

- `src/app/login/page.tsx`
  公共入口选择页。当前 UI 要求：志愿者入口在左侧，使用蓝色主按钮；管理员入口在右侧，使用白色次按钮；两个入口都要用小方块卡片框起来，整体尺寸应与后续登录页保持一致。

- `src/app/(auth)/volunteer/login/page.tsx`
  志愿者登录页，使用 `MockLoginForm`，仅允许 `volunteer` 角色登录。

- `src/app/(auth)/admin/login/page.tsx`
  部门负责人登录页，使用 `MockLoginForm`，仅允许 `admin` 角色登录。不要在这里提供超级管理员入口。

- `src/app/(auth)/superadmin/login/page.tsx`
  超级管理员专用登录页，使用 `MockLoginForm`，仅允许 `super_admin` 角色登录。该地址不应在普通 UI 中公开链接。

- `src/components/forms/MockLoginForm.tsx`
  当前登录表单组件。包含账号、密码、保持登录、错误提示、忘记密码提示和可选的其他入口链接。

- `src/components/auth/SessionGuard.tsx`
  客户端会话守卫，用于处理“不保持登录”的标签页级会话逻辑。

- `src/lib/auth.ts`
  服务端读取当前用户的工具函数。当前从 cookie 中读取 mock 用户名，再从 `mockUsers` 查找用户。

- `src/lib/auth-constants.ts`
  统一保存登录 cookie 名称。

- `middleware.ts`
  基础路由保护和角色跳转。

- `src/lib/mock-data.ts`
  当前测试账号和 mock 用户数据来源。

## 当前测试账号

当前还未接真实数据库认证，登录使用 `mockUsers` 中的测试账号：

- 超级管理员：`superadmin` / `123456`
- 部门负责人：`admin1` / `123456`
- 部门负责人：`admin2` / `123456`
- 志愿者：`volunteer1` / `123456`
- 志愿者：`volunteer2` / `123456`

## 当前认证方式

当前是 mock 登录，不是真实安全认证。

登录成功后：

1. `MockLoginForm` 在 `mockUsers` 中匹配账号、密码、角色和状态。
2. 匹配成功后写入 cookie：`wenti_mock_role=<username>`。
3. 服务端通过 `getCurrentUser()` 读取 cookie，再查找 mock 用户。
4. 根据用户角色跳转到 `/admin` 或 `/volunteer`。

后续接入真实认证时，应替换为：

- 数据库存储密码哈希，不保存明文密码。
- 登录接口校验账号密码。
- 使用安全 session、JWT 或 NextAuth。
- cookie 设置 `httpOnly`、`secure`、`sameSite` 等属性。
- 将 `mockUsers` 替换为数据库查询。

## 保持登录逻辑

登录页有“保持登录”复选框。

当前行为：

- 勾选“保持登录”：cookie 设置 7 天有效期，并在 `localStorage` 写入 `wenti_remember_login=1`。
- 不勾选“保持登录”：cookie 不设置 `max-age`，并在 `sessionStorage` 写入 `wenti_tab_session_active=1`。
- 关闭标签页后，`sessionStorage` 会丢失；再次访问后台时，`SessionGuard` 会清理 cookie 并跳回登录页。
- 退出登录时，会清理 cookie、`localStorage` 和 `sessionStorage`。

相关常量：

- cookie：`wenti_mock_role`
- localStorage：`wenti_remember_login`
- sessionStorage：`wenti_tab_session_active`

注意：`SessionGuard` 是客户端守卫。当前 mock 阶段可接受；真实认证阶段应在服务端 session 层严格处理过期和保持登录策略。

## 路由保护规则

`middleware.ts` 当前处理：

- 未登录访问 `/admin/*` -> `/admin/login`
- 未登录访问 `/volunteer/*` -> `/volunteer/login`
- 已登录访问 `/dashboard` -> 根据角色分流
- 志愿者访问 `/admin/*` -> `/volunteer`
- 管理员访问 `/volunteer/*` -> `/admin`
- `/admin/accounts` 和 `/admin/settings` 仅 `super_admin` 可访问

公开登录路径：

- `/login`
- `/admin/login`
- `/volunteer/login`
- `/superadmin/login`

## UI 约定

公共入口页 `/login`：

- 页面尺寸应与 `/volunteer/login` 和 `/admin/login` 接近，避免跳转前后视觉突兀。
- 外层使用白色卡片。
- 内部两个入口要各自用小方块卡片框起来。
- 志愿者入口放左侧，使用蓝色主按钮。
- 管理员入口放右侧，使用白色次按钮。
- 不展示超级管理员入口。

登录表单页：

- 使用统一的 `MockLoginForm`。
- 包含账号、密码、保持登录。
- 底部提示：“如果忘记密码，请联系部门负责人重置密码。”
- 管理员登录页只给部门负责人使用。
- 志愿者登录页只给普通志愿者使用。
- 超级管理员登录页独立存在，不从普通页面链接过去。

## 后续真实化改造建议

1. 新增真实登录 API，例如 `POST /api/auth/login`。
2. 用 Prisma 查询 `User`，校验 `passwordHash`。
3. 将 `MockLoginForm` 中的本地匹配改为调用 API。
4. 用服务端生成 session，cookie 使用 `httpOnly`。
5. 将“保持登录”映射为不同的 session 过期时间。
6. 接入首次登录修改初始密码逻辑。
7. 用数据库中的 `mustChangePassword` 控制首次登录后跳转到改密页。
8. 删除或隔离 `mockUsers`，避免 mock 数据进入生产逻辑。

## 开发注意事项

本项目使用 Next.js App Router。登录页放在 `(auth)` 路由组下，是为了让 URL 仍然是 `/admin/login`、`/volunteer/login`、`/superadmin/login`，但不继承 `/admin` 或 `/volunteer` 的后台布局。

修改前端页面后，当前开发约定是：

1. 停止 dev server。
2. 清理 `.next`。
3. 重新启动 `npm run dev`。

这是为了避免开发缓存和生产构建缓存混用导致 CSS 或 JS chunk 404。
