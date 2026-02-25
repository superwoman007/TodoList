# TodoList

一个现代化的待办事项管理应用，支持 PWA 和 Android 平台。

## 功能特性

- **任务管理**: 创建、编辑、删除任务，支持子任务
- **标签分类**: 自定义标签，灵活分类管理
- **提醒功能**: 任务到期提醒
- **场景模板**: 预设场景快速创建任务列表
- **PWA 支持**: 可安装到桌面，离线使用
- **Android 应用**: 通过 Capacitor 打包为原生应用
- **响应式设计**: 完美适配移动端和桌面端
- **深色模式**: 支持系统级深色模式
- **撤销功能**: 操作失误可一键撤销

## 技术栈

### 前端
- HTML5 + Tailwind CSS (CDN)
- 原生 JavaScript (无框架)
- PWA (Service Worker + Web App Manifest)
- Capacitor (Android 打包)

### 后端
- Python 3.13
- FastAPI
- SQLite (SQLAlchemy ORM)
- JWT 认证

## 项目结构

```
TodoList/
├── apps/
│   ├── web/                 # PWA 前端应用
│   │   ├── index.html       # 主页面
│   │   ├── app.js           # 应用逻辑
│   │   ├── api.js           # API 调用
│   │   ├── manifest.json    # PWA 清单
│   │   ├── sw.js            # Service Worker
│   │   └── icons/           # 应用图标
│   └── api/                 # FastAPI 后端
│       └── app/
│           ├── main.py      # 应用入口
│           ├── routers/     # API 路由
│           ├── models/      # 数据模型
│           ├── schemas/     # Pydantic 模式
│           └── services/    # 业务逻辑
├── android/                 # Android Capacitor 项目
├── deploy/                  # 部署脚本和配置
└── plans/                   # 项目规划文档
```

## 快速开始

### 环境要求

- Python 3.13+
- Node.js 18+ (用于 Capacitor)
- SQLite3

### 安装依赖

```bash
# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/macOS

# 安装 Python 依赖
pip install fastapi uvicorn sqlalchemy bcrypt pyjwt apscheduler

# 安装 Node.js 依赖 (可选，用于 Android 打包)
npm install
```

### 运行开发服务器

```bash
# 启动后端 API
cd apps/api
uvicorn app.main:app --reload --port 8000

# 启动前端静态服务 (另一个终端)
cd apps/web
python -m http.server 8002
```

访问 http://localhost:8002/apps/web/index.html 即可使用应用。

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/auth/register` | POST | 用户注册 |
| `/auth/login` | POST | 用户登录 |
| `/todos` | GET/POST | 获取/创建任务 |
| `/todos/{id}` | PUT/DELETE | 更新/删除任务 |
| `/tags` | GET/POST | 标签管理 |
| `/subtasks` | GET/POST | 子任务管理 |
| `/reminders` | GET/POST | 提醒管理 |
| `/scene-templates` | GET/POST | 场景模板管理 |

## 部署

项目提供了完整的部署脚本，支持 HTTPS 配置：

```bash
cd deploy
./deploy.sh
```

详细部署说明请参考 `deploy/` 目录下的文档。

## 移动端适配

- 触控优化：所有交互控件最小触达尺寸 ≥44px
- 视图切换：移动端支持单列/多列视图切换
- 无障碍：支持键盘导航和屏幕阅读器
- 动效降级：尊重用户 `prefers-reduced-motion` 设置

## 开发进度

详见 [说明文档.md](./说明文档.md)

## 许可证

MIT License
