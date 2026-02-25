# TodoList APK 构建说明

## 推荐方案：使用 PWA Builder 在线构建（最简单）

由于本地配置 Android SDK 环境较为复杂，推荐使用 **PWA Builder** 在线服务构建 APK。

### 使用 PWA Builder 构建步骤

1. **访问 PWA Builder**
   - 打开浏览器访问：https://www.pwabuilder.com/

2. **输入应用信息**
   - **URL**：输入你的 Web 应用 URL（如果已部署）
   - **或者**：点击 "Upload" 上传 `apps/web` 文件夹

3. **配置应用信息**
   - **Name**: TodoList
   - **Short Name**: TodoList
   - **Description**: TodoList 任务管理应用
   - **Theme Color**: #6366F1
   - **Background Color**: #0F172A

4. **选择图标**
   - 上传 `apps/web/icons/icon.svg` 或其他图标文件

5. **选择平台**
   - 勾选 **Android** 平台
   - 点击 "Generate" 按钮

6. **下载 APK**
   - 等待构建完成
   - 下载生成的 APK 文件

### 优势
- ✅ 无需安装 Java 和 Android SDK
- ✅ 无需配置签名
- ✅ 支持自动更新
- ✅ 构建速度快

---

## 本地构建方案（需要配置环境）

如果需要在本地构建，需要完成以下配置：

### 1. 安装 Java JDK 17

Java 已安装但需要配置环境变量：

```bash
# 添加到 ~/.zshrc
echo 'export JAVA_HOME=/opt/homebrew/opt/openjdk@17' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 验证
java -version
```

### 2. 安装 Android SDK

```bash
# 使用 Homebrew 安装 Android Studio（包含 SDK）
brew install --cask android-studio

# 或者只安装命令行工具
brew install android-platform-tools
```

配置环境变量：
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

### 3. 接受 Android SDK 许可证

```bash
yes | sdkmanager --licenses
```

### 4. 构建 APK

```bash
# 同步最新代码
npx @capacitor/cli@latest sync android

# 构建 Debug APK
JAVA_HOME=/opt/homebrew/opt/openjdk@17 npx @capacitor/cli@latest build android

# 构建 Release APK（需要签名）
JAVA_HOME=/opt/homebrew/opt/openjdk@17 npx @capacitor/cli@latest build android --release
```

### 5. APK 输出位置

构建成功后，APK 文件位于：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 项目配置信息

- **应用名称**: TodoListPWA
- **包名**: com.todolist.pwa
- **Web 目录**: apps/web
- **Capacitor 配置**: capacitor.config.json

---

## 其他在线构建服务

### 1. Capacitor Cloud
- 访问 https://capacitorjs.com/docs/guides/cloud
- 连接 GitHub 仓库
- 配置自动构建

### 2. Appcircle
- 访问 https://appcircle.io/
- 支持 Web 应用打包
- 提供免费构建额度

---

## 快速开始

**推荐使用 PWA Builder**：
1. 访问 https://www.pwabuilder.com/
2. 上传 `apps/web` 文件夹
3. 选择 Android 平台
4. 下载 APK
