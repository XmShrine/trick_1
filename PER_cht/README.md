# 性格屋 · Persona Chat

一个可以和不同性格的人聊天的网页。支持多家大模型，用户可自行在「⚙️ 模型设置」里选择。
key 藏在 Cloudflare 服务端环境变量里，前端不暴露。

## 支持的供应商

| 供应商 | 接口格式 | 后端环境变量 | 默认模型 |
| --- | --- | --- | --- |
| DeepSeek | OpenAI 兼容 | `DEEPSEEK_API_KEY` | `deepseek-chat` |
| OpenAI · GPT | OpenAI | `OPENAI_API_KEY` | `gpt-4o` |
| Claude · Anthropic | 原生 `/v1/messages` | `ANTHROPIC_API_KEY` | `claude-opus-4-8` |
| Gemini · Google | OpenAI 兼容端点 | `GEMINI_API_KEY` | `gemini-2.0-flash` |
| 通义千问 · Qwen | OpenAI 兼容（百炼） | `DASHSCOPE_API_KEY` | `qwen-plus` |
| 智谱 · GLM | OpenAI 兼容 | `ZHIPU_API_KEY` | `glm-4.6` |
| MiniMax | OpenAI 兼容（v2） | `MINIMAX_API_KEY` | `MiniMax-Text-01` |
| OpenCode Zen | OpenAI 兼容网关 | `OPENCODE_API_KEY` | `claude-sonnet-4-6` |

供应商清单在 `providers.js` 里，模型可在设置弹窗里临时覆盖（留空用默认）。
只有 Claude 走 Anthropic 原生协议（`system` 单独传、`x-api-key` 头、不传 `temperature`），
其余都走 OpenAI 兼容协议——所以加一家新的 OpenAI 兼容供应商，只需在 `providers.js` 和
`functions/api/chat.js` 各加一行。

## 文件结构

```
persona-chat/
├─ index.html          页面
├─ styles.css          样式
├─ providers.js        供应商库（去哪家、用什么模型、接口格式）
├─ personas.js         人物库（加新人物改这里）
├─ app.js              前端逻辑（按供应商组请求、解析流式、默认调 /api/chat 代理）
└─ functions/
   └─ api/
      └─ chat.js       Cloudflare Pages Function：按 provider 注入 key 并转发
```

## 部署到 Cloudflare Pages

1. 把 `persona-chat/` 推到 GitHub，或用 `wrangler pages deploy persona-chat`。
2. 在 Cloudflare 控制台 → 你的 Pages 项目 → **Settings → Environment variables**
   按你想用的供应商添加上表里的环境变量（值是对应平台的 key，建议设为 **Secret / 加密**）。
   只配你要用的那几家即可，没配的供应商被选中时会返回提示，互不影响。
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
  此方式没有代理，需点左下「⚙️ 模型设置」选好供应商、临时填 key 直连。
  注意：本地直连受浏览器 CORS 限制，部分供应商（如 OpenAI）可能拒绝跨域；
  Claude 已自动带上 `anthropic-dangerous-direct-browser-access` 头。要稳，用方式一的代理。

## 加新人物

在 `personas.js` 的 `PERSONAS` 数组里加一项：`id / name / emoji / color / tagline / greeting / system`。
`system` 就是这个人的"性格说明书"，决定 AI 用什么身份和语气说话。
