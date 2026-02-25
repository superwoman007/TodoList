# 开发任务拆解（Scrum Master）

## 1. 前端（apps/web）
- 建立项目骨架与主题切换（明/暗）：app/layout.tsx、styles、theme 切换逻辑；测试：快照与交互。
- 列表页实现：features/todos/ListView、搜索与筛选组件；测试：过滤逻辑与渲染。
- 看板视图实现：features/todos/BoardView、拖拽交互；测试：拖拽状态更新。
- 任务详情页：features/todos/Detail、子任务/标签/提醒编辑；测试：表单与状态变更。
- API 客户端封装：lib/api/client.ts（REST 契约统一）；测试：请求与错误处理。
- PWA 与离线缓存：service worker、IndexedDB 缓存策略；测试：离线快照与增量同步。

## 2. 后端（apps/api）
- 框架与数据库：FastAPI、SQLAlchemy、Alembic 初始化；测试：连接与迁移。
- 鉴权模块：/auth/register、/auth/login、/auth/me；JWT 与中间件；测试：密码哈希、令牌校验。
- Todo 模块：CRUD 与分页过滤；测试：创建/查询/更新/删除与分页。
- List 模块：CRUD；测试：创建与更新顺序。
- Tag 模块与绑定：CRUD 与批量绑定；测试：绑定关系正确。
- Subtask 模块：CRUD 与排序；测试：父子关系与完成状态。
- Reminder 模块：CRUD 与 APScheduler 调度；测试：定时触发与重试。
- Health：健康检查端点；测试：返回 200 与状态。

## 3. 测试（QA）
- 前端单测与 E2E（Playwright）：登录、创建任务、筛选、看板拖拽。
- 后端 pytest + httpx：鉴权、各模块 CRUD、权限与错误处理。
- 覆盖率门禁：≥70%；报告输出到 .boss/todolist/qa-report.md。

## 4. 部署（DevOps）
- Web：Vercel 部署与预览链接；构建设置与环境变量。
- API：Docker 化并部署至 Fly.io/Render/Railway（任选）；健康检查与日志。
- 输出部署报告：.boss/todolist/deploy-report.md。

