#!/bin/bash
# ============================================
# TodoList 服务器环境初始化脚本
# 在服务器上运行此脚本
# ============================================

set -e

echo "=== TodoList 服务器环境初始化 ==="

# 更新系统包
echo "[1/7] 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装必要的系统依赖
echo "[2/7] 安装系统依赖..."
sudo apt install -y python3-pip python3-venv nginx git openssl

# 创建项目目录
echo "[3/7] 创建项目目录..."
sudo mkdir -p /var/www/todolist
sudo chown -R $USER:$USER /var/www/todolist

# 创建虚拟环境
echo "[4/7] 创建 Python 虚拟环境..."
cd /var/www/todolist
python3 -m venv venv

# 安装 Python 依赖
echo "[5/7] 安装 Python 依赖..."
if [ -f deploy/requirements.txt ]; then
    ./venv/bin/pip install -r deploy/requirements.txt
fi

# 生成 SSL 证书（自建 CA + 服务器证书）
echo "[6/7] 生成 SSL 证书..."
if [ -f deploy/gen-cert.sh ]; then
    sudo bash deploy/gen-cert.sh
fi

# 配置 Nginx
echo "[7/7] 配置 Nginx..."
if [ -f deploy/nginx.conf ]; then
    sudo cp deploy/nginx.conf /etc/nginx/sites-available/todolist
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf /etc/nginx/sites-available/todolist /etc/nginx/sites-enabled/todolist
    sudo nginx -t && sudo systemctl reload nginx
fi

echo ""
echo "=== 初始化完成 ==="
echo ""
echo "CA 根证书下载地址（手机浏览器访问安装）:"
echo "  https://111.230.56.116/certs/ca.crt"
echo "  http://111.230.56.116/certs/ca.crt  (首次可用 HTTP)"
echo ""
echo "请继续运行 deploy/deploy.sh 进行部署"
