# 华师本科课表同步与逐周排班

## 本地准备

1. 启动 MySQL 8，建立独立测试库，把连接串写入未跟踪的 `.env`。不要对生产库运行种子脚本。
2. 安装 Node 依赖：`npm ci`；安装 Python 3.12 依赖：`python -m venv .venv`，在虚拟环境中运行 `pip install -r solver/requirements.txt`。
3. 在 `.env` 中设置至少 32 字符的 `SESSION_SECRET`、64 位十六进制的 `CCNU_SESSION_KEY`、随机 `CRON_SECRET` 和指向虚拟环境 Python 的 `ORTOOLS_PYTHON`。这三个密钥必须分别生成，不能提交。
4. 运行 `npx prisma migrate deploy`、`npx prisma generate`、`npm test`、`npx tsc --noEmit`、`npm run build`，随后 `npm run dev`。

在新建的测试库运行 `npm run db:seed` 后，可以保持本地服务运行，再执行 `npm run test:integration` 验证登录来源、角色权限、缺员草稿、手动调整、发布与发布后冲突。此测试只接受库名以 `_test` 结尾的数据库，并清理自己创建的课表与排班数据。

Windows 本地 MySQL 示例：`docker run --name wenti-roster-mysql -e MYSQL_ROOT_PASSWORD=localtest -e MYSQL_DATABASE=wenti_roster_test -p 3307:3306 -d mysql:8.0`。这是一次性测试实例，测试密码不能用于正式服务。

## 使用

- 成员先用本站志愿者账号登录，在“我的课表”填写本人的校内学号、密码与学期代码（如 `2026-2027-1`），点击“授权并同步”。校内认证返回的学号必须与本站账号的学号一致。系统只保存加密的教务 Cookie，最多 24 小时，不保存校内密码。授权到期后重新授权；同步失败时保留上次课表。Excel 上传入口仍可使用。
- 负责人在“自动排班”设置学期代码、首周周一日期、教学周数、需要排班的周次、每周班次、地点和每班人数，勾选候选成员并保存。生成草稿时，仅当前学期课表有效的候选成员参与求解。课程起止时刻相接不算冲突，周次按实际日期展开。
- 草稿可调整每个班次的人员。缺员可以保留草稿，人数补齐且资格再次校验通过后才可发布。发布后的排班保持原样；若之后课表同步产生冲突，负责人页面会提示。成员只能看到已发布的全体班次及姓名，看不到他人的课表、学号或联系方式。
- 负责人可点击“批量刷新课表”。每日定时刷新通过 `GET /api/cron/ccnu-refresh` 执行，请求头为 `Authorization: Bearer <CRON_SECRET>`。本地可运行 `npm run ccnu:refresh`；部署到项目 README 使用的 `/opt/wenti` 目录后，安装 `deploy/wenti-ccnu-refresh.service` 和 `.timer` 到 `/etc/systemd/system/`，执行 `sudo systemctl daemon-reload && sudo systemctl enable --now wenti-ccnu-refresh.timer`。timer 每天北京时间 04:00 触发，需配置 `CRON_BASE_URL` 和 `CRON_SECRET`。定时器只在安装并启动后运行。

## 校内接口与维护

本科适配器根据 CCNU Box 公共实现中使用的 CAS 登录及 `bkzhjw.ccnu.edu.cn/jsxsd/xskb/xskb_list.do` 协议编写，核心逻辑位于 `src/lib/ccnu.ts` 和 `src/lib/ccnu-parser.ts`。学校可能调整登录页面字段、验证码、Cookie 生命周期或课程 JSON 格式，需用真实账号验收；若返回格式无法确认，同步会报错并保留原课表。当前仅支持本科生，且仅用课程判断可用时间。

来源：[CCNU Box 本科 CAS 适配](https://github.com/asynccnu/ccnubox-be/blob/main/be-ccnu/crawler/undergrad.go)、[课表接口与字段](https://github.com/asynccnu/ccnubox-be/blob/main/be-classlist/crawler/crawler_3.go)。本项目适配代码独立编写，没有复制这些文件。
