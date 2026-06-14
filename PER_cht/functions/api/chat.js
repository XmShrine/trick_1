// ============================================================================
//  Cloudflare Pages Function —— DeepSeek 代理
//  路径: /api/chat
//  作用: 前端不带 key 调这里，本函数在服务端注入 key 再转发给 DeepSeek，
//        并把流式响应原样透传回去。key 存在环境变量 DEEPSEEK_API_KEY 里。
// ============================================================================

const UPSTREAM = "https://api.deepseek.com/chat/completions";

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env.DEEPSEEK_API_KEY;

  if (!key) {
    return json({ error: { message: "服务端未配置 DEEPSEEK_API_KEY 环境变量。" } }, 500);
  }

  // 解析并约束请求体，避免这个端点被当成任意模型的公开代理
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: { message: "请求体不是合法 JSON。" } }, 400);
  }

  const safeBody = {
    model: "deepseek-chat",
    messages: Array.isArray(payload.messages) ? payload.messages : [],
    stream: payload.stream !== false,
    temperature: clamp(payload.temperature, 0, 2, 1.1),
    max_tokens: clamp(payload.max_tokens, 1, 4096, 1024),
  };

  if (safeBody.messages.length === 0) {
    return json({ error: { message: "messages 不能为空。" } }, 400);
  }

  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify(safeBody),
  });

  // 流式 / 非流式都原样透传
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") || "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

function clamp(v, min, max, dflt) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
