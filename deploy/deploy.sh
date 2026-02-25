#!/bin/bash
# ============================================
# TodoList 部署脚本
# 在服务器上运行此脚本（在 setup-server.sh 之后）
# ============================================

set -e

PROJECT_DIR="/var/www/todolist"
API_DIR="$PROJECT_DIR/api"
WEB_DIR="$PROJECT_DIR/web"

echo "=== TodoList 应用部署 ==="

# 停止现有服务
echo "[1/5] 停止现有服务..."
sudo systemctl stop todolist 2>/dev/null || true

# 更新 API 代码
echo "[2/5] 更新 API 代码..."
mkdir -p "$API_DIR"
if [ -d "apps/api" ]; then
    cp -r apps/api/app "$API_DIR/"
    cp -r apps/api/tests "$API_DIR/" 2>/dev/null || true
fi

# 更新 Web 代码
echo "[3/5] 更新 Web 代码..."
mkdir -p "$WEB_DIR"
if [ -d "apps/web" ]; then
    cp -r apps/web/* "$WEB_DIR/"
fi

# 更新 Python 依赖
echo "[4/5] 更新 Python 依赖..."
cd "$PROJECT_DIR"
if [ -f deploy/requirements.txt ]; then
    ./venv/bin/pip install -r deploy/requirements.txt -q
fi

# 初始化数据库
echo "[5/5] 初始化数据库..."
cd "$API_DIR"
../venv/bin/python -c "from app.db.init_db import init_db; init_db()" 2>/dev/null || true

# 安装并启动 systemd 服务
echo "[6/6] 启动服务..."
if [ -f deploy/todolist.service ]; then
    sudo cp deploy/todolist.service /etc/systemd/system/todolist.service
    sudo systemctl daemon-reload
    sudo systemctl enable todolist
    sudo systemctl start todolist
fi

# 检查服务状态
echo ""
echo "=== 部署完成 ==="
echo ""
echo "检查服务状态..."
sudo systemctl status todolist --no-pager

echo ""
echo "=== 访问地址 ==="
echo "前端: https://111.230.56.116/"
echo "API:  https://111.230.56.116/api/"
echo "健康检查: https://111.230.56.116/health"
echo "CA 证书下载: https://111.230.56.116/certs/ca.crt"
