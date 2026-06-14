// ============================================================================
//  供应商库 providers
//  这个文件定义“去哪家大模型、用什么模型、接口长什么样”。
//  想加新供应商：往下面 PROVIDERS 数组里再加一项即可。
//
//  format 只有两种：
//    "openai"    —— OpenAI 兼容接口（DeepSeek / GPT / Gemini / Qwen / GLM /
//                   MiniMax / OpenCode 都走这条；用 Bearer key，SSE 里取
//                   choices[0].delta.content）。
//    "anthropic" —— Claude 原生 /v1/messages 接口（system 单独传、x-api-key 头、
//                   SSE 里取 content_block_delta；绝不能带 temperature）。
//
//  proxyEnv  —— 线上走 Cloudflare 代理时，后端从这个环境变量里取 key。
//  keyHint   —— 设置弹窗里给用户的提示（key 一般长什么样 / 去哪申请）。
// ============================================================================

const PROVIDERS = [
  {
    id: "deepseek",
    name: "DeepSeek",
    format: "openai",
    baseURL: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
    proxyEnv: "DEEPSEEK_API_KEY",
    keyHint: "形如 sk-...，在 platform.deepseek.com 申请。",
  },
  {
    id: "openai",
    name: "OpenAI · GPT",
    format: "openai",
    baseURL: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
    proxyEnv: "OPENAI_API_KEY",
    keyHint: "形如 sk-...，在 platform.openai.com 申请。可改模型为 gpt-4o-mini 等。",
  },
  {
    id: "claude",
    name: "Claude · Anthropic",
    format: "anthropic",
    baseURL: "https://api.anthropic.com/v1/messages",
    model: "claude-opus-4-8",
    proxyEnv: "ANTHROPIC_API_KEY",
    keyHint: "形如 sk-ant-...，在 platform.claude.com 申请。本地直连需浏览器放行。",
  },
  {
    id: "gemini",
    name: "Gemini · Google",
    format: "gemini", // 走 Gemini 原生接口：key 放 ?key= 查询参数，不是 Bearer 头
    // baseURL 只到 .../models，真正地址是 baseURL/<模型>:streamGenerateContent?alt=sse
    baseURL: "https://generativelanguage.googleapis.com/v1beta/models",
    model: "gemini-2.0-flash",
    proxyEnv: "GEMINI_API_KEY",
    keyHint: "在 aistudio.google.com 申请，形如 AIza...（和 sk- 不一样，放在 ?key= 里）。",
  },
  {
    id: "qwen",
    name: "通义千问 · Qwen",
    format: "openai", // 阿里云百炼 OpenAI 兼容模式
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-plus",
    proxyEnv: "DASHSCOPE_API_KEY",
    keyHint: "阿里云百炼 DashScope 的 key（sk-...）。",
  },
  {
    id: "glm",
    name: "智谱 · GLM",
    format: "openai",
    baseURL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4.6",
    proxyEnv: "ZHIPU_API_KEY",
    keyHint: "智谱开放平台的 key。免费可用 glm-4-flash。",
  },
  {
    id: "minimax",
    name: "MiniMax",
    format: "openai", // MiniMax v2 是 OpenAI 兼容的
    baseURL: "https://api.minimaxi.com/v1/text/chatcompletion_v2",
    model: "MiniMax-Text-01",
    proxyEnv: "MINIMAX_API_KEY",
    keyHint: "MiniMax 开放平台的 API key。",
  },
  {
    id: "opencode",
    name: "OpenCode Zen",
    format: "openai", // OpenCode Zen 网关，OpenAI 兼容
    baseURL: "https://opencode.ai/zen/v1/chat/completions",
    model: "claude-sonnet-4-6",
    proxyEnv: "OPENCODE_API_KEY",
    keyHint: "OpenCode Zen 网关 key；模型名按它支持的填。",
  },
];

// 默认选中的供应商
const DEFAULT_PROVIDER_ID = "deepseek";

const providerById = (id) =>
  PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
