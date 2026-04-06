# bg-remover-next

图片去背景 SaaS — Next.js 15 + Cloudflare Pages + D1

## 功能

- Google OAuth 登录
- 用量控制（未登录1次/天，免费3次/月，Pro 50次/月，一次性包20次）
- 注册送1次额度
- remove.bg API 去背景
- 个人中心（用量统计、套餐信息）

## 技术栈

- **前端**: Next.js 15, React 19, Tailwind CSS
- **后端**: Cloudflare Pages (Edge Runtime)
- **数据库**: Cloudflare D1 (SQLite)
- **部署**: Cloudflare Pages via `@cloudflare/next-on-pages`

## 本地开发

```bash
npm install
npm run dev
```

## 部署

```bash
npm run build:cf
npx wrangler pages deploy .vercel/output/static --project-name=bg-remover-next
```

## 环境变量（Cloudflare Pages 后台配置）

| 变量名 | 说明 |
|--------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `REMOVE_BG_API_KEY` | remove.bg API Key |

D1 绑定名：`DB`，数据库：`bg-remover-db`

## 定价策略

| 套餐 | 价格 | 额度 |
|------|------|------|
| 免费 | $0 | 3次/月 + 注册送1次 |
| Pro 月付 | $9.9/月 | 50次/月 |
| Pro 年付 | $59.9/年 | 50次/月 |
| 一次性包 | $4.9 | 20次（永不过期）|
