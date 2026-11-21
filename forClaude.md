# 对于 Claude 如何操作此文件夹的指示

1. 让你添加外部某个项目：请你参考 `index.html` 中项目格式，将项目链接添加进去，并在 `update.html` 中添加更新项目

---

## 添加外部项目的具体做法（Claude 整理，待批准）

### 先判断：挪进来，还是只加链接？

- **大的 Worker 项目**（有自己的后端或部署，例如 Cloudflare Workers 上的牛来、Buy-Gift）：项目留在原处，不挪进 trick_1，只在首页加一张外链卡片，链接写完整网址。
- **纯静态页面**（只有 html/css/js/图片，不需要服务器）：要挪进 trick_1。按 README 的规矩，建一个 `XXX_xxx` 文件夹（前三个字母大写、后三个小写，中间下划线），入口是 `XXX_xxx/index.html`，卡片里用相对路径 `window.open('XXX_xxx/index.html', '_blank')`。

下面说的是只加链接的情况：只改两个文件，`index.html` 和 `update.html`。其他文件（`theme.css`、`common.js`、各项目文件夹、`.DS_Store`）都不碰。标准范例是提交 `fa20081`（牛来）。

### 动手前先问清楚 / 先确认

- **网址能打开**：用浏览器打开一次，确认页面正常，并记下它到底是做什么的。更新日志要写具体内容，不能只写「新增了 XX」。
- **作者**：不是站长自己做的，卡片要加 `by 作者名` 角标；不确定是谁做的就问。
- **要不要密码**：外部链接目前都没设密码。用户要求加密码时，才改用 `showPasswordModal(...)`，密码值找用户要。
- **国内能不能打开**：`*.workers.dev` 在国内基本打不开。遇到这种域名要提醒用户，但照常添加，不擅自换地址。

### 第一步：`index.html` 加卡片

- 位置：`#cardGrid` 里最后一张卡片之后、那段周年跳转 `<script>` 之前，新项目永远排在最后。
- 格式（外部链接一律新标签页打开）：

```html
<div class="card" onclick="window.open('https://完整网址', '_blank')" data-title="标题 搜索关键词1 关键词2">
    <span class="badge">by 作者</span>   <!-- 站长自己的项目不加这一行 -->
    <div class="card-icon" style="background: linear-gradient(135deg, #色1, #色2); font-size: 26px;">🎁</div>
    <div class="card-title">标题</div>
    <div class="card-desc">一句很短的说明</div>
</div>
```

- `data-title`：首页搜索只匹配这个属性，所以除了标题，还要放几个别人可能会搜的词，用空格隔开。
- 图标：一个 emoji，配一组和项目本身配色接近的渐变色。不要和相邻卡片撞色。
- `card-desc`：保持 2～6 个字的短说明，和其他卡片风格一致（例如「小游戏」「latex 工具」「MCH 周边」）。
- 不改其他卡片，不调整顺序，不加新的 CSS。确实需要特殊样式（比如「周年新作」那种）时，先问用户。

### 第二步：`update.html` 加版本条目

- 位置：`<div class="container">` 的最前面，也就是当前最新版本的上方。
- 版本号：在当前最新版本的小版本号上加 1（例如 v3.8 → v3.9）。只有站长明确说要发大版本时才进位。
- 标签：新内容用 `<span class="tag minor">Feature</span>`，只修问题用 `<span class="tag patch">Patch</span>`，`major` 只用于周年这类大版本。
- 日期：写当天的日期，格式为「2026年10月23日」。
- 格式照抄现有条目：

```html
<!-- v3.9 -->
<div class="version-item" style="animation-delay: 0s">
    <div class="timeline-dot"></div>
    <div class="version-card">
        <div class="v-header">
            <div><span class="v-num">v3.9</span><span class="tag minor">Feature</span></div>
            <span class="v-date">2026年10月23日</span>
        </div>
        <div class="v-content">
            <h3>✨ 新内容</h3>
            <ul>
                <li>新工具「XX」：一句话说清它是什么、怎么玩</li>
                <li>再写 1～3 条具体好玩的点</li>
            </ul>
        </div>
    </div>
</div>
```

- 文案面向访客：说能玩到什么、能做什么，不写技术细节（不提 Worker、API、框架这类词）。

### 第三步：自查

- 在浏览器里打开 `index.html`，确认三件事：新卡片显示正常，点了能在新标签页打开网址，搜索框里搜关键词能搜到它。
- 打开 `update.html`，确认新条目排在最上面，版本号和日期都对。
- `git diff` 只应出现这两个文件的新增行，不应有对其他行的改动。

### 第四步：提交（必须先问）

- 改完先给用户看改动，**用户同意后**才 `git commit`，提交信息沿用仓库习惯，用简短英文或拼音（例如 `niulai`）。
- 只提交 `index.html` 和 `update.html`，不把 `.DS_Store` 一起提交。
- `git push` 会直接更新线上网站，**每次都要单独得到用户同意**。
