#!/bin/bash
# ============================================
# 自建 CA + 签发服务器证书（含 IP SAN）
# 在服务器上运行: sudo bash gen-cert.sh
# ============================================

set -e

SSL_DIR="/etc/nginx/ssl"
SERVER_IP="111.230.56.116"
CA_DAYS=3650    # CA 有效期 10 年
CERT_DAYS=825   # 服务器证书有效期 ~2 年

echo "=== 生成自签名 CA 和服务器证书 ==="

sudo mkdir -p "$SSL_DIR"
cd "$SSL_DIR"

# ---- 1. 生成 CA 根证书 ----
echo "[1/3] 生成 CA 根证书..."
sudo openssl genrsa -out ca.key 2048
sudo openssl req -new -x509 -days $CA_DAYS -key ca.key -out ca.crt \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=TodoList/OU=Dev/CN=TodoList Root CA"

# ---- 2. 生成服务器证书（含 IP SAN）----
echo "[2/3] 生成服务器证书..."

# 创建扩展配置文件（关键：必须包含 IP SAN）
sudo tee server.ext > /dev/null << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = ${SERVER_IP}
DNS.1 = localhost
IP.2 = 127.0.0.1
EOF

# 生成服务器私钥和 CSR
sudo openssl genrsa -out server.key 2048
sudo openssl req -new -key server.key -out server.csr \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=TodoList/OU=Server/CN=${SERVER_IP}"

# 用 CA 签发服务器证书
sudo openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days $CERT_DAYS -extfile server.ext

# ---- 3. 复制 CA 证书到 Web 可下载目录 ----
echo "[3/3] 部署证书..."
sudo mkdir -p /var/www/todolist/apps/web/certs
sudo cp ca.crt /var/www/todolist/apps/web/certs/ca.crt
sudo chmod 644 /var/www/todolist/apps/web/certs/ca.crt

# 清理临时文件
sudo rm -f server.csr server.ext ca.srl

# 设置权限
sudo chmod 600 ca.key server.key
sudo chmod 644 ca.crt server.crt

echo ""
echo "=== 证书生成完成 ==="
echo "CA 根证书:     $SSL_DIR/ca.crt"
echo "服务器证书:    $SSL_DIR/server.crt"
echo "服务器私钥:    $SSL_DIR/server.key"
echo ""
echo "CA 证书下载地址: https://${SERVER_IP}/certs/ca.crt"
echo ""
echo "请重启 nginx: sudo systemctl restart nginx"
