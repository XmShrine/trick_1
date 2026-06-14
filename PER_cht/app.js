// ============================================================================
//  性格屋 —— 主逻辑
//  聊天后端：可选多家大模型（见 providers.js）。
//  默认走服务端代理 /api/chat（key 藏在 Cloudflare 环境变量里，前端不带 key）。
//  本地用 python http.server 预览时没有代理 —— 在「⚙️ 模型设置」里填 key 临时直连。
// ============================================================================

const PROXY_URL = "/api/chat";

const LS_KEYS = "personachat_keys_v1"; // { providerId: "key" }
const LS_MODELS = "personachat_models_v1"; // { providerId: "模型覆盖" }
const LS_PROVIDER = "personachat_provider"; // 当前选中的供应商 id
const LS_HISTORY = "personachat_history_v1";

// ---------------------------------------------------------------------------
// 状态
// ---------------------------------------------------------------------------
let currentId = DEFAULT_PERSONA_ID;
let currentProviderId = loadProviderId();
let keys = loadJSON(LS_KEYS); // { providerId: key }
let models = loadJSON(LS_MODELS); // { providerId: model }
let histories = loadHistories(); // { personaId: [{role, content}, ...] }
let streaming = false;

const personaById = (id) => PERSONAS.find((p) => p.id === id);
const currentProvider = () => providerById(currentProviderId);
const modelFor = (p) => (models[p.id] || p.model).trim();
const keyFor = (p) => (keys[p.id] || "").trim();

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
  providerSelect: $("providerSelect"),
  modelInput: $("modelInput"),
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
  renderProviderOptions();
  refreshSettingsButton();
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
  // 在弹窗里切换供应商时，把该供应商已存的 key/模型/提示填进去
  els.providerSelect.onchange = () => fillProviderFields(els.providerSelect.value);
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

function renderProviderOptions() {
  els.providerSelect.innerHTML = "";
  PROVIDERS.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    els.providerSelect.appendChild(opt);
  });
}

function refreshSettingsButton() {
  els.openSettings.textContent = "⚙️ 模型：" + currentProvider().name;
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
// 发送 + 流式调用
// ---------------------------------------------------------------------------
async function send() {
  if (streaming) return;
  const text = els.input.value.trim();
  if (!text) return;

  const p = personaById(currentId);
  const provider = currentProvider();

  // 记录并显示用户消息
  histories[currentId].push({ role: "user", content: text });
  addBubble("user", text, p);
  els.input.value = "";
  autoGrow();
  saveHistories();

  // 占位的「对方正在输入」气泡
  setStreaming(true);
  const bubble = addBubble("assistant", "", p, { typing: true });

  // 组装请求体（不同供应商格式不同，见 buildPayload）
  const payload = buildPayload(provider, p, histories[currentId]);

  let acc = "";
  try {
    await streamChat(provider, payload, (delta) => {
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

// 组装发给模型的请求体：system + 最近若干轮对话
function buildPayload(provider, persona, history) {
  const recent = history.slice(-20);
  const model = modelFor(provider);

  if (provider.format === "anthropic") {
    // Claude 原生接口：system 单独传；messages 首条必须是 user，去掉开头的 assistant。
    const msgs = recent.map((m) => ({ role: m.role, content: m.content }));
    while (msgs.length && msgs[0].role === "assistant") msgs.shift();
    return {
      model,
      system: persona.system,
      messages: msgs,
      max_tokens: 1024,
      stream: true,
      // 注意：claude-opus-4-8 / 4.7 不接受 temperature，传了会 400，所以这里不传。
    };
  }

  // OpenAI 兼容接口：system 放进 messages 第一条。
  return {
    model,
    messages: [
      { role: "system", content: persona.system },
      ...recent.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    temperature: 1.1,
  };
}

// 流式聊天：有本地 key 就直连对应供应商，否则走服务端代理（key 藏在后端）。
async function streamChat(provider, payload, onDelta) {
  const key = keyFor(provider);
  const direct = !!key;

  let url, body;
  const headers = { "Content-Type": "application/json" };

  if (direct) {
    url = provider.baseURL;
    if (provider.format === "anthropic") {
      headers["x-api-key"] = key;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "true";
    } else {
      headers["Authorization"] = "Bearer " + key;
    }
    body = JSON.stringify(payload);
  } else {
    // 走代理：把 provider id + 已组好的请求体交给后端，由后端补上 key。
    url = PROXY_URL;
    body = JSON.stringify({ provider: provider.id, body: payload });
  }

  const res = await fetch(url, { method: "POST", headers, body });

  if (!res.ok) {
    let detail = res.status + " " + res.statusText;
    try {
      const j = await res.json();
      const msg = (j.error && j.error.message) || j.message;
      if (msg) detail = msg;
    } catch (_) {}
    if (res.status === 401) detail = "API Key 无效或未授权。";
    if (res.status === 404 && !direct)
      detail = "代理 /api/chat 不存在。本地预览请在「模型设置」里填 key 直连，或用 wrangler 运行。";
    throw new Error(detail);
  }

  await readSSE(res.body, provider.format, onDelta);
}

// 逐行解析 SSE 流，按供应商格式取出增量文本。
async function readSSE(stream, format, onDelta) {
  const reader = stream.getReader();
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
      if (!s || !s.startsWith("data:")) continue; // 跳过 event: / 空行
      const data = s.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = extractDelta(format, json);
        if (delta) onDelta(delta);
      } catch (_) {
        /* 跳过不完整片段 */
      }
    }
  }
}

// 从一段 JSON 里取出本次增量文本（两种格式）。
function extractDelta(format, json) {
  if (format === "anthropic") {
    if (json.type === "error")
      throw new Error((json.error && json.error.message) || "Claude 流式错误");
    if (
      json.type === "content_block_delta" &&
      json.delta &&
      json.delta.type === "text_delta"
    )
      return json.delta.text || "";
    return "";
  }
  // openai 兼容
  return (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) || "";
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
  els.providerSelect.value = currentProviderId;
  fillProviderFields(currentProviderId);
  els.settingsMask.classList.add("show");
}

// 把某个供应商当前已存的 key / 模型 / 提示，填进弹窗
function fillProviderFields(providerId) {
  const p = providerById(providerId);
  els.modelInput.value = models[providerId] || "";
  els.modelInput.placeholder = "默认：" + p.model;
  els.keyInput.value = keys[providerId] || "";
  els.keyNote.textContent = p.keyHint || "";
}

function saveSettings() {
  const pid = els.providerSelect.value;
  currentProviderId = pid;
  localStorage.setItem(LS_PROVIDER, pid);

  const model = els.modelInput.value.trim();
  if (model) models[pid] = model;
  else delete models[pid];
  saveJSON(LS_MODELS, models);

  const key = els.keyInput.value.trim();
  if (key) keys[pid] = key;
  else delete keys[pid];
  saveJSON(LS_KEYS, keys);

  refreshSettingsButton();
  els.settingsMask.classList.remove("show");
}

// ---------------------------------------------------------------------------
// 持久化
// ---------------------------------------------------------------------------
function loadProviderId() {
  const id = localStorage.getItem(LS_PROVIDER);
  return PROVIDERS.some((p) => p.id === id) ? id : DEFAULT_PROVIDER_ID;
}
function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (_) {
    return {};
  }
}
function saveJSON(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (_) {}
}
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
