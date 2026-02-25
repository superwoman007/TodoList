## 项目总览
- 目标：用 Boss Skill 全自动编排，从需求到部署交付一套 Web/PWA TodoList（移动端优先），后端使用 Python。
- 特色：界面美观（ui-ux-pro-max 设计系统）、中文本地化、离线可用、可安装（PWA）、覆盖完整测试与质量门禁。

## Boss Skill 流程与产物目录
- 统一特性名：`todolist`
- 产物目录：`.boss/todolist/`
  - PRD：`prd.md`
  - 架构：`architecture.md`
  - UI 规范：`ui-spec.md`
  - 技术评审：`tech-review.md`
  - 任务拆解：`tasks.md`
  - QA 报告：`qa-report.md`
  - 部署报告：`deploy-report.md`

## 阶段 1：规划（PM / 架构师 / UI 设计师）
- PM Agent：
  - 穿透需求（显性/隐性/潜在/惊喜），形成中文 PRD（含用户故事、验收标准）。
  - 输出：`.boss/todolist/prd.md`
- 架构师 Agent：
  - 基于 PRD 设计系统架构（前端 Next.js、后端 FastAPI、DB、鉴权、缓存、同步、离线、日志、安全）。
  - 输出：`.boss/todolist/architecture.md`
- UI 设计师 Agent（整合 ui-ux-pro-max）：
  - 生成设计系统（风格、色彩、字体、组件、交互与可访问性），并给出页面/组件规格与代码落地指南。
  - 输出：`.boss/todolist/ui-spec.md`

## 阶段 2：评审与任务拆解（Tech Lead / Scrum Master）
- Tech Lead Agent：
  - 技术评审与风险分析（安全、性能、维护成本、依赖合规），形成实施建议与代码规范。
  - 输出：`.boss/todolist/tech-review.md`
- Scrum Master Agent：
  - 将 PRD 用户故事拆解为文件级任务，明确依赖、优先级与测试用例草案（单元/集成/E2E）。
  - 输出：`.boss/todolist/tasks.md`

## 阶段 3：开发与持续验证（前端 / 后端 / QA）
- 前端开发 Agent：
  - 基于 `ui-spec.md` 实现：基础布局、主题（明/暗）、任务列表/看板/详情页、筛选与搜索、PWA/离线、手势与动画。
  - 要求：所有函数/组件添加中文函数级注释（功能、参数、返回值）。
- 后端开发 Agent（Python）：
  - 框架：FastAPI + SQLAlchemy + Alembic；DB：Postgres（生产）/ SQLite（本地）。
  - 模块：auth（JWT/OAuth2）、todos、lists、tags、subtasks、reminders、search、health。
  - 调度：APScheduler（提醒任务）；安全：输入校验、速率限制、CORS、统一错误处理。
- QA Agent（持续）：
  - 前端：Vitest + Testing Library；E2E：Playwright（登录/创建/筛选/看板拖拽）。
  - 后端：pytest + httpx；模型/会话/鉴权/权限用例；覆盖率≥70%。
  - 输出：`.boss/todolist/qa-report.md`

## 阶段 4：部署与交付（DevOps）
- Web（Next.js）：构建并部署到 Vercel，提供预览与生产链接。
- API（FastAPI）：Docker 化，部署到 Fly.io/Render/Railway（三选一），启用健康检查与日志。
- 输出：`.boss/todolist/deploy-report.md` 与可访问 URL。

## 设计系统（ui-ux-pro-max 约束）
- 风格：Minimalism + Bento Grid + 轻玻璃，移动端优先；统一暗/明主题，避免布局抖动。
- 色彩：主色渐变蓝紫；中性 slate/gray；反馈色 success/warning/error；对比度≥4.5:1。
- 字体：Noto Sans SC（中文）+ Inter（拉丁），数字/代码 Geist Mono；正文行高 1.6、行长 65–75 字。
- 组件：导航（顶部 + 移动底部 Tab）、任务卡、添加输入、筛选/标签、日期选择器、优先级选择、批量操作、模态/抽屉、FAB。
- 交互：触摸目标≥44×44px；可见 focus ring；微交互 150–300ms（transform/opacity）；尊重 prefers-reduced-motion；所有点击元素 cursor-pointer 与明确反馈。

## 技术接口与数据模型（Python 后端）
- Auth：POST /auth/register、POST /auth/login、GET /auth/me；JWT Bearer。
- Todo：GET /todos（分页/过滤）、POST /todos、GET/PUT/DELETE /todos/{id}。
- List：GET/POST/PUT/DELETE /lists；看板按 status 聚合。
- Tag：GET/POST/PUT/DELETE /tags；POST /todos/{id}/tags 批量绑定。
- Subtask：GET/POST/PUT/DELETE /todos/{id}/subtasks。
- Reminder：GET/POST/PUT/DELETE /todos/{id}/reminders；APScheduler 执行。
- Search：GET /search?q=...
- Health：GET /health。
- 数据实体：User、Todo、List、Tag、TodoTag、Subtask、Reminder、ActivityLog（含时间戳与 ownerId）。

## 文档与规范（中文）
- 创建并维护「说明文档.md」（项目规划、实施方案、进度记录），每次任务完成即更新进度；所有注释与文档统一中文。
- 安全：密钥不入库；.env 管理；输入校验与速率限制；统一错误处理与日志等级。

## 验收与质量门禁
- 测试全部通过；覆盖率≥70%；无高危 Bug；A11y 检查通过；移动端断点（375/768/1024/1440）适配良好。
- 交付：中文文档完整、测试/部署报告、可访问预览链接（Web）与 API 域名。

## 里程碑（高层）
- M1：初始化项目与「说明文档.md」；搭建 FastAPI 基础与 DB；确定部署渠道。
- M2：生成并固化设计系统；Web 基础布局与主题切换；API 鉴权与 Todo CRUD。
- M3：列表页与看板；筛选与搜索；前后端联调；子任务/标签。
- M4：提醒与后台调度；活动日志；PWA 与离线策略。
- M5：完善测试与质量门禁；部署与交付。

## 默认决策与可调参数
- 后端：Python FastAPI（如需 Django/DRF 可替换，保留 API 契约）。
- 数据库：生产 Postgres；本地 SQLite；云托管可选 Neon/Supabase DB。
- 移动端：默认 PWA；如需原生，追加 React Native + Expo（阶段二）。
- 设计偏好：极简 + Bento + 轻玻璃（可替换配色/字体以匹配品牌）。

请确认：按以上 Boss Skill 全流程执行（PRD→架构→UI→评审→任务→开发→测试→部署），后端使用 Python，所有文档与注释统一中文。我将据此启动流水线并交付可访问结果。