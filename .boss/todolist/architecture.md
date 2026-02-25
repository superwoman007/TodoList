# TodoList 架构设计（Architecture）

## 1. 总体架构
- Monorepo：apps/web（Next.js）+ apps/api（FastAPI）+ packages/shared（协议/DTO/设计令牌）
- 通信：REST JSON（必要时扩展 WebSocket 用于看板协作）
- 数据：Postgres（生产）/ SQLite（本地），ORM：SQLAlchemy，迁移：Alembic
- 鉴权：JWT（OAuth2PasswordBearer），密码哈希：bcrypt
- 调度：APScheduler（提醒任务）
- 前端状态：TanStack Query（数据）+ Zustand（UI/业务）
- 离线：Service Worker + IndexedDB，乐观更新，冲突以服务器 updatedAt 为准

## 2. 目录结构
### 前端（apps/web）
- app/ 路由与布局
- components/ 通用 UI 组件（基于 shadcn/ui）
- features/ 业务模块（todos、lists、tags、search、settings）
- lib/ 客户端（API 封装、缓存策略、设计令牌）
- stores/ 状态（Zustand）
- hooks/ 自定义钩子
- styles/ 样式与主题
- tests/ 前端测试与 E2E

### 后端（apps/api）
- app/main.py 入口
- routers/ auth、todos、lists、tags、subtasks、reminders、search、health
- models/ SQLAlchemy 模型
- schemas/ Pydantic 模式
- services/ 业务服务（鉴权、提醒、查询器）
- db/ 会话管理与 Alembic 迁移
- tests/ 后端测试

## 3. 关键流程
- 登录流程：/auth/login → 验证密码 → 发放 JWT → 前端存储（安全策略）→ 鉴权中间件校验
- 列表与看板：/todos（分页/过滤）→ 前端呈现 → 看板拖拽变更 status → PUT /todos/{id}
- 任务详情：加载子任务/标签/提醒 → 增改删 → 乐观更新 → 冲突修正
- 提醒触发：APScheduler 注册定时任务 → 到期触发站内通知（或后续推送）
- 离线同步：IndexedDB 保存快照 → 在线后比对增量 → 以服务器时间戳为准合并

## 4. API 契约（选摘）
- Auth：POST /auth/register、POST /auth/login、GET /auth/me
- Todo：GET /todos?query&tag&status&priority&page&limit、POST /todos、GET/PUT/DELETE /todos/{id}
- List：GET/POST/PUT/DELETE /lists；看板聚合 /board（扩展）
- Tag：GET/POST/PUT/DELETE /tags；POST /todos/{id}/tags（批量）
- Subtask：GET/POST/PUT/DELETE /todos/{id}/subtasks
- Reminder：GET/POST/PUT/DELETE /todos/{id}/reminders
- Search：GET /search?q=...
- Health：GET /health

## 5. 安全与合规
- 密钥不入库；配置 .env 管理
- CORS 仅允许前端域名；速率限制与输入校验
- 统一错误处理（结构化响应与日志等级）
- 代码与文档中文注释，函数级注释完整（功能/参数/返回值）

## 6. 部署与运维
- Web：Vercel（构建、预览与生产）
- API：Docker 化部署至 Fly.io/Render/Railway（任选），健康检查 /health
- 监控与日志：请求/错误日志，必要时接入告警

