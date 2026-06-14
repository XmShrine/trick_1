# 性格屋 · Persona Chat

一个可以和不同性格的人聊天的网页。后端用 DeepSeek，key 藏在 Cloudflare 服务端，前端不暴露。

## 文件结构

```
persona-chat/
├─ index.html          页面
├─ styles.css          样式
├─ personas.js         人物库（加新人物改这里）
├─ app.js              前端逻辑（默认调 /api/chat 代理）
└─ functions/
   └─ api/
      └─ chat.js       Cloudflare Pages Function：注入 key 转发 DeepSeek
```

## 部署到 Cloudflare Pages

1. 把 `persona-chat/` 推到 GitHub，或用 `wrangler pages deploy persona-chat`。
2. 在 Cloudflare 控制台 → 你的 Pages 项目 → **Settings → Environment variables**
   添加一个变量：
   - 名称：`DEEPSEEK_API_KEY`
   - 值：你的 DeepSeek key（`sk-...`）
   - 建议设为 **Secret / 加密**
3. 构建设置：无需构建命令；输出目录就是项目根（含 `functions/`）。
4. 部署后访问站点即可，前端会自动调用同源的 `/api/chat`，key 不会出现在浏览器里。

## 本地预览

- **方式一（推荐，能测代理）**：
  ```bash
  npx wrangler pages dev persona-chat
  ```
  本地用 `.dev.vars` 文件放 `DEEPSEEK_API_KEY=sk-...`。

- **方式二（只看界面）**：
  ```bash
  python3 -m http.server 8123   # 在 persona-chat 目录里
  ```
  此方式没有代理，需点页面右下「⚙️ 设置」临时填 key 直连 DeepSeek。

## 加新人物

在 `personas.js` 的 `PERSONAS` 数组里加一项：`id / name / emoji / color / tagline / greeting / system`。
`system` 就是这个人的"性格说明书"，决定 AI 用什么身份和语气说话。
