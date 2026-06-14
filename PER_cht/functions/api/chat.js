// ============================================================================
//  Cloudflare Pages Function —— /api/chat 多供应商代理
//
//  前端 POST 过来 { provider: "<id>", body: <已组好的请求体> }，
//  这里按 provider 找到上游地址，从环境变量里取出对应的 key 注入请求头，
//  转发到真正的大模型接口，并把流式响应原样透传回前端。
//  好处：key 只存在服务端环境变量里，永远不出现在浏览器里；同时绕开 CORS。
//
//  部署时在 Cloudflare Pages → Settings → Environment variables 里，
//  按你要用的供应商添加对应的环境变量（建议设为 Secret / 加密）：
//    DEEPSEEK_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY
//    DASHSCOPE_API_KEY / ZHIPU_API_KEY / MINIMAX_API_KEY / OPENCODE_API_KEY
//  没配的供应商在前端选了也会返回提示，互不影响。
// ============================================================================

// 上游地址 / 取 key 的环境变量名 / 鉴权方式。
// url 固定在服务端，不接受前端传入，避免被当成任意转发器（SSRF）。
const PROVIDERS = {
  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    env: "DEEPSEEK_API_KEY",
    auth: "bearer",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    env: "OPENAI_API_KEY",
    auth: "bearer",
  },
  claude: {
    url: "https://api.anthropic.com/v1/messages",
    env: "ANTHROPIC_API_KEY",
    auth: "anthropic",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    env: "GEMINI_API_KEY",
    auth: "bearer",
  },
  qwen: {
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    env: "DASHSCOPE_API_KEY",
    auth: "bearer",
  },
  glm: {
    url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    env: "ZHIPU_API_KEY",
    auth: "bearer",
  },
  minimax: {
    url: "https://api.minimaxi.com/v1/text/chatcompletion_v2",
    env: "MINIMAX_API_KEY",
    auth: "bearer",
  },
  opencode: {
    url: "https://opencode.ai/zen/v1/chat/completions",
    env: "OPENCODE_API_KEY",
    auth: "bearer",
  },
};

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return jsonError("只支持 POST。", 405);

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return jsonError("请求体不是合法 JSON。", 400);
  }

  // 正常形态：{ provider, body }。
  // 兼容老前端：如果直接发来 OpenAI 形的裸 body（带 messages、没 provider），
  // 当作 deepseek 处理，避免把整包当成聊天体转发导致 “messages 为空”。
  let { provider: providerId, body } = payload || {};
  if (!providerId && payload && Array.isArray(payload.messages)) {
    providerId = "deepseek";
    body = payload;
  }

  const cfg = PROVIDERS[providerId];
  if (!cfg) return jsonError("未知的供应商：" + providerId, 400);
  if (!body) return jsonError("缺少请求体 body。", 400);

  const key = env[cfg.env];
  if (!key)
    return jsonError(
      `后端未配置 ${cfg.env}，请在 Cloudflare 环境变量里添加该供应商的 key。`,
      500
    );

  const headers = { "Content-Type": "application/json" };
  if (cfg.auth === "anthropic") {
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers["Authorization"] = "Bearer " + key;
  }

  let upstream;
  try {
    upstream = await fetch(cfg.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    return jsonError("连接上游失败：" + err.message, 502);
  }

  // 原样透传上游的状态码与流式响应体（成功是 SSE，失败是 JSON 错误）。
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") || "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
