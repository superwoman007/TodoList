# 部署报告（阶段性）

## 1. Web 部署
- 本地预览：已启动 http://localhost:8000/（Python http.server，原型验证）；\n
- 生产建议：Next.js（Vercel），环境变量管理与构建配置；\n

## 2. API 部署
- 运行方式：Uvicorn（开发）、Gunicorn/Uvicorn（生产）；\n
- 容器化建议：Dockerfile + Fly.io/Render/Railway（三选一），开启 /health 检查；\n
- 依赖：FastAPI、SQLAlchemy、Pydantic、bcrypt、PyJWT、APScheduler；\n

## 3. 环境与安全
- .env 管理密钥（JWT_SECRET、DATABASE_URL 等）；\n
- CORS 仅允许前端域名；速率限制与输入校验；\n

## 4. 交付链接与验证项
- Web 预览链接：http://localhost:8000/\n
- API：启动脚本与路由完整，健康检查 /health；\n

