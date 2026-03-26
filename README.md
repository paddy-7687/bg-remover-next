# 图片去背景服务

基于 **Next.js + Tailwind CSS** 构建的图片去背景工具，支持部署到 Vercel / Cloudflare Pages。

## 技术栈

- **框架**：Next.js 15 (App Router)
- **样式**：Tailwind CSS
- **API**：Remove.bg
- **部署**：Vercel（推荐）

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入 Remove.bg API Key

# 3. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 部署到 Vercel

```bash
npx vercel --prod
```

在 Vercel 控制台添加环境变量 `REMOVE_BG_API_KEY`。

## 功能

- 🖼️ 拖拽/点击上传图片
- 🔄 左右对比预览（原图 vs 去背景）
- ⬇️ 一键下载 PNG（透明背景）
- 📱 移动端适配
