// ============================================================================
//  性格屋 —— 主逻辑
//  聊天后端：DeepSeek（OpenAI 兼容接口）
// ============================================================================

// 默认走服务端代理 /api/chat（key 藏在 Cloudflare 环境变量里，前端不带 key）。
// 本地用 python http.server 预览时没有代理 —— 在「⚙️ 设置」里填 key 即可临时直连。
const PROXY_URL = "/api/chat";
const DIRECT_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

// 留空。仅当你想把 key 硬编进前端（不推荐）时才填。
const BUILTIN_KEY = "";

const LS_KEY = "deepseek_api_key";
const LS_HISTORY = "personachat_history_v1";

// ---------------------------------------------------------------------------
// 状态
// ---------------------------------------------------------------------------
let currentId = DEFAULT_PERSONA_ID;
let histories = loadHistories(); // { personaId: [{role, content}, ...] }
let streaming = false;

const personaById = (id) => PERSONAS.find((p) => p.id === id);

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const els = {
  personaList: $("personaList"),
  messages: $("messages"),
  input: $("input"),
  sendBtn: $("sendBtn"),
  clearBtn: $("clearBtn"),
  headAvatar: $("headAvatar"),
  headName: $("headName"),
  headTag: $("headTag"),
  sidebar: $("sidebar"),
  menuBtn: $("menuBtn"),
  openSettings: $("openSettings"),
  settingsMask: $("settingsMask"),
  keyInput: $("keyInput"),
  keyNote: $("keyNote"),
  saveSettings: $("saveSettings"),
  cancelSettings: $("cancelSettings"),
};

// ---------------------------------------------------------------------------
// 初始化
// ---------------------------------------------------------------------------
function init() {
  renderPersonaList();
  selectPersona(currentId, false);

  els.sendBtn.onclick = send;
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  els.input.addEventListener("input", autoGrow);

  els.clearBtn.onclick = clearCurrent;
  els.menuBtn.onclick = () => els.sidebar.classList.toggle("open");
  els.messages.addEventListener("click", () => els.sidebar.classList.remove("open"));

  // 设置弹窗
  els.openSettings.onclick = openSettings;
  els.cancelSettings.onclick = () => els.settingsMask.classList.remove("show");
  els.settingsMask.onclick = (e) => {
    if (e.target === els.settingsMask) els.settingsMask.classList.remove("show");
  };
  els.saveSettings.onclick = saveSettings;
}

// ---------------------------------------------------------------------------
// 人物列表
// ---------------------------------------------------------------------------
function renderPersonaList() {
  PERSONAS.forEach((p) => {
    const card = document.createElement("div");
    card.className = "persona-card";
    card.dataset.id = p.id;
    card.innerHTML = `
      <div class="avatar" style="background:${p.color}">${p.emoji}</div>
      <div class="meta">
        <div class="pname">${p.name}</div>
        <div class="ptag">${p.tagline}</div>
      </div>`;
    card.onclick = () => {
      selectPersona(p.id);
      els.sidebar.classList.remove("open");
    };
    els.personaList.appendChild(card);
  });
}

function selectPersona(id, focus = true) {
  currentId = id;
  const p = personaById(id);

  document.querySelectorAll(".persona-card").forEach((c) => {
    c.classList.toggle("active", c.dataset.id === id);
  });

  els.headAvatar.textContent = p.emoji;
  els.headAvatar.style.background = p.color;
  els.headName.textContent = p.name;
  els.headTag.textContent = p.tagline;
  document.documentElement.style.setProperty("--accent", p.color);
  document.documentElement.style.setProperty("--bubble-me", p.color);

  // 首次进入该人物：放一句开场白
  if (!histories[id]) {
    histories[id] = [{ role: "assistant", content: p.greeting }];
    saveHistories();
  }

  renderMessages();
  if (focus) els.input.focus();
}

// ---------------------------------------------------------------------------
// 消息渲染
// ---------------------------------------------------------------------------
function renderMessages() {
  const p = personaById(currentId);
  els.messages.innerHTML = "";
  (histories[currentId] || []).forEach((m) => addBubble(m.role, m.content, p));
  scrollDown();
}

function addBubble(role, text, p, opts = {}) {
  const row = document.createElement("div");
  row.className = "row " + (role === "user" ? "me" : "them");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  if (role !== "user") {
    avatar.style.background = p.color;
    avatar.textContent = p.emoji;
  } else {
    avatar.textContent = "🙂";
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (opts.typing ? " typing dot-flash" : "");
  bubble.textContent = text;

  row.appendChild(avatar);
  row.appendChild(bubble);
  els.messages.appendChild(row);
  scrollDown();
  return bubble;
}

function scrollDown() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function autoGrow() {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 140) + "px";
}

// ---------------------------------------------------------------------------
// 发送 + DeepSeek 流式调用
// ---------------------------------------------------------------------------
async function send() {
  if (streaming) return;
  const text = els.input.value.trim();
  if (!text) return;

  const key = getKey(); // 本地直连才需要；线上为空，自动走代理

  const p = personaById(currentId);

  // 记录并显示用户消息
  histories[currentId].push({ role: "user", content: text });
  addBubble("user", text, p);
  els.input.value = "";
  autoGrow();
  saveHistories();

  // 占位的「对方正在输入」气泡
  setStreaming(true);
  const bubble = addBubble("assistant", "", p, { typing: true });

  // 组装发给 DeepSeek 的消息：system + 最近若干轮对话
  const msgs = [
    { role: "system", content: p.system },
    ...histories[currentId].slice(-20),
  ];

  let acc = "";
  try {
    await streamChat(key, msgs, (delta) => {
      acc += delta;
      bubble.classList.remove("typing", "dot-flash");
      bubble.textContent = acc;
      scrollDown();
    });

    if (!acc.trim()) {
      acc = "（…他没说话，可能是网络或额度的问题，再试一次？）";
      bubble.classList.remove("typing", "dot-flash");
      bubble.textContent = acc;
    }
    histories[currentId].push({ role: "assistant", content: acc });
    saveHistories();
  } catch (err) {
    bubble.classList.remove("typing", "dot-flash");
    bubble.textContent = "⚠️ 出错了：" + err.message;
    // 出错的回复不写进历史，方便重发
  } finally {
    setStreaming(false);
    els.input.focus();
  }
}

// 流式聊天：有本地 key 就直连 DeepSeek，否则走服务端代理（key 藏在后端）
async function streamChat(key, messages, onDelta) {
  const direct = !!key;
  const headers = { "Content-Type": "application/json" };
  if (direct) headers.Authorization = "Bearer " + key;

  const res = await fetch(direct ? DIRECT_URL : PROXY_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      temperature: 1.1,
    }),
  });

  if (!res.ok) {
    let detail = res.status + " " + res.statusText;
    try {
      const j = await res.json();
      if (j.error && j.error.message) detail = j.error.message;
    } catch (_) {}
    if (res.status === 401) detail = "API Key 无效或未授权。";
    if (res.status === 404 && !direct)
      detail = "代理 /api/chat 不存在。本地预览请在「设置」里填 key 直连，或用 wrangler 运行。";
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split("\n");
    buf = lines.pop(); // 留下可能不完整的一行

    for (const line of lines) {
      const s = line.trim();
      if (!s || !s.startsWith("data:")) continue;
      const data = s.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch (_) {
        /* 跳过不完整片段 */
      }
    }
  }
}

function setStreaming(on) {
  streaming = on;
  els.sendBtn.disabled = on;
}

// ---------------------------------------------------------------------------
// 清空 / 设置
// ---------------------------------------------------------------------------
function clearCurrent() {
  const p = personaById(currentId);
  histories[currentId] = [{ role: "assistant", content: p.greeting }];
  saveHistories();
  renderMessages();
}

function openSettings() {
  els.keyInput.value = localStorage.getItem(LS_KEY) || "";
  els.keyNote.textContent = BUILTIN_KEY
    ? "已内置一个 Key；在此填写可覆盖它。"
    : "";
  els.keyNote.className = "note";
  els.settingsMask.classList.add("show");
  els.keyInput.focus();
}

function saveSettings() {
  const v = els.keyInput.value.trim();
  if (v) localStorage.setItem(LS_KEY, v);
  else localStorage.removeItem(LS_KEY);
  els.settingsMask.classList.remove("show");
}

function getKey() {
  return (localStorage.getItem(LS_KEY) || BUILTIN_KEY || "").trim();
}

// ---------------------------------------------------------------------------
// 历史持久化
// ---------------------------------------------------------------------------
function loadHistories() {
  try {
    return JSON.parse(localStorage.getItem(LS_HISTORY)) || {};
  } catch (_) {
    return {};
  }
}
function saveHistories() {
  try {
    localStorage.setItem(LS_HISTORY, JSON.stringify(histories));
  } catch (_) {}
}

// ---------------------------------------------------------------------------
init();
