# 移动端 HTTPS 自签名证书适配指南

## 概述

本项目使用 IP 地址 + 自签名证书部署 HTTPS 服务。由于自签名证书不在系统信任链中，移动端（手机浏览器、Android APK）需要额外配置才能正常访问。

## 服务器端部署

### 1. 生成证书

在服务器上执行：

```bash
cd /var/www/todolist
sudo bash deploy/gen-cert.sh
```

这会生成：
- **CA 根证书**: `/etc/nginx/ssl/ca.crt` + `/etc/nginx/ssl/ca.key`
- **服务器证书**: `/etc/nginx/ssl/server.crt` + `/etc/nginx/ssl/server.key`（含 IP SAN）
- CA 证书副本: `/var/www/todolist/apps/web/certs/ca.crt`（供下载）

### 2. 部署 Nginx 配置

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/todolist
sudo ln -sf /etc/nginx/sites-available/todolist /etc/nginx/sites-enabled/todolist
sudo nginx -t && sudo systemctl restart nginx
```

### 3. 验证

```bash
# 检查 HTTPS 是否正常
curl -k https://111.230.56.116/health

# 检查 CA 证书下载端点
curl -k https://111.230.56.116/certs/ca.crt
```

---

## 手机浏览器适配

### Android 手机浏览器

1. 用手机浏览器访问: `http://111.230.56.116/certs/ca.crt`（注意用 HTTP）
2. 系统会提示下载证书文件，点击下载
3. 进入 **设置 → 安全 → 加密与凭据 → 安装证书 → CA 证书**
4. 选择刚下载的 `ca.crt` 文件，确认安装
5. 安装完成后，用浏览器访问 `https://111.230.56.116` 即可正常加载

> 不同 Android 厂商的设置路径可能略有不同，一般在「安全」或「隐私」相关设置中。

### iOS Safari

1. 用 Safari 访问: `http://111.230.56.116/certs/ca.crt`
2. 系统弹出「此网站正尝试下载一个配置描述文件」，点击 **允许**
3. 进入 **设置 → 通用 → VPN与设备管理**，找到下载的描述文件，点击 **安装**
4. 输入锁屏密码确认
5. **重要**: 进入 **设置 → 通用 → 关于本机 → 证书信任设置**，找到 `TodoList Root CA`，**开启完全信任**
6. 用 Safari 访问 `https://111.230.56.116` 即可正常加载

---

## Android APK 适配

### 原理

APK 通过以下三层机制信任自签名证书：

1. **`network_security_config.xml`**: 声明信任内置的 CA 根证书
2. **`res/raw/ca.pem`**: 内置 CA 根证书文件
3. **`MainActivity.java`**: WebView SSL 错误处理兜底

### 构建步骤

#### 1. 获取 CA 证书

从服务器下载 CA 根证书：

```bash
scp ubuntu@111.230.56.116:/etc/nginx/ssl/ca.crt android/app/src/main/res/raw/ca.pem
```

或者手动复制：

```bash
# 在服务器上
cat /etc/nginx/ssl/ca.crt

# 将输出内容复制到本地文件
# android/app/src/main/res/raw/ca.pem
```

#### 2. 同步 Capacitor 配置

```bash
npx cap sync android
```

#### 3. 构建 APK

```bash
cd android
./gradlew assembleDebug
```

APK 输出路径: `android/app/build/outputs/apk/debug/app-debug.apk`

### 配置说明

**`capacitor.config.json`** 中 `server.url` 设置为 `https://111.230.56.116`，APK 启动后直接加载远程页面，前端更新无需重新打包 APK。

**`network_security_config.xml`** 配置了：
- 信任系统 CA + 自签名 CA
- 针对 `111.230.56.116` 的特定信任规则
- debug 模式额外信任用户安装的证书

---

## 更换服务器 IP

如果服务器 IP 变更，需要修改以下文件：

1. `deploy/gen-cert.sh` - 修改 `SERVER_IP` 变量
2. `deploy/nginx.conf` - 修改 `server_name`
3. `capacitor.config.json` - 修改 `server.url`
4. 重新在服务器上运行 `gen-cert.sh` 生成新证书
5. 重新下载 CA 证书到 `android/app/src/main/res/raw/ca.pem`
6. 重新构建 APK

---

## 常见问题

### Q: 手机浏览器仍然提示不安全？
A: 确认已安装 CA 根证书，且证书包含正确的 IP SAN。可以在浏览器中查看证书详情确认。

### Q: APK 白屏或无法加载？
A: 检查 `res/raw/ca.pem` 是否为实际的 CA 证书内容（不是占位符），确认已执行 `npx cap sync android`。

### Q: iOS 安装证书后仍然不信任？
A: iOS 需要两步：先安装描述文件，再到「证书信任设置」中手动开启完全信任。

### Q: 证书过期了怎么办？
A: 重新运行 `deploy/gen-cert.sh`，然后更新 APK 中的 `ca.pem`，手机上重新安装新的 CA 证书。
