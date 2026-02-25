#!/bin/bash
# ============================================
# 本地打包上传脚本
# 在本地运行此脚本将项目上传到服务器
# 使用方法: ./upload.sh
# ============================================

SERVER="111.230.56.116"
USER="ubuntu"
REMOTE_DIR="/var/www/todolist"

echo "=== TodoList 打包上传 ==="

# 创建临时打包目录
TEMP_DIR=$(mktemp -d)
PACKAGE_DIR="$TEMP_DIR/todolist"

echo "[1/4] 准备文件..."
mkdir -p "$PACKAGE_DIR/apps/api/app"
mkdir -p "$PACKAGE_DIR/apps/web"
mkdir -p "$PACKAGE_DIR/deploy"

# 复制 API 文件
cp -r apps/api/app/* "$PACKAGE_DIR/apps/api/app/"
cp apps/api/requirements.txt "$PACKAGE_DIR/apps/api/" 2>/dev/null || true

# 复制 Web 文件
cp -r apps/web/* "$PACKAGE_DIR/apps/web/"

# 复制部署脚本
cp deploy/*.sh "$PACKAGE_DIR/deploy/"
cp deploy/*.conf "$PACKAGE_DIR/deploy/"
cp deploy/*.service "$PACKAGE_DIR/deploy/"
cp deploy/requirements.txt "$PACKAGE_DIR/deploy/"

# 打包
echo "[2/4] 打包项目..."
cd "$TEMP_DIR"
tar -czf todolist.tar.gz todolist

# 上传
echo "[3/4] 上传到服务器..."
echo "请输入服务器密码:"
scp todolist.tar.gz $USER@$SERVER:/tmp/

# 在服务器上解压
echo "[4/4] 在服务器上解压..."
ssh $USER@$SERVER << 'ENDSSH'
    cd /var/www/todolist
    tar -xzf /tmp/todolist.tar.gz --strip-components=1
    rm /tmp/todolist.tar.gz
    echo "文件已上传到 /var/www/todolist"
ENDSSH

# 清理
rm -rf "$TEMP_DIR"

echo ""
echo "=== 上传完成 ==="
echo "请 SSH 登录服务器执行以下命令完成部署:"
echo "  cd /var/www/todolist"
echo "  chmod +x deploy/*.sh"
echo "  ./deploy/setup-server.sh  # 首次部署时执行"
echo "  ./deploy/deploy.sh        # 每次更新时执行"
