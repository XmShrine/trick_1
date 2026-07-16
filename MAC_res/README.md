# MC 资源包目录结构

新增一个资源包时，**不需要**自己写 `index.html`，只需要建一个文件夹放两样东西：

1. `README.md` —— 顶部带 front matter（标题 + 下载文件列表），下面正常写 Markdown 说明
2. 要下载的文件本身（zip / mcpack 等，路径要和 README 里 `path` 对应）

`README.md` 格式示例：

```
---
title: 展示标题
files:
  - label: 稳定版
    path: xxx.zip
  - label: 测试版
    path: xxx-beta.zip
---
# 正文标题
这里写正常的 Markdown 说明，支持 $数学公式$ 和代码块。
```

然后在 `MAC_res/index.html` 的卡片里指向共用模板即可：

```html
onclick="window.open('download.html?pkg=<文件夹名>', '_blank')"
```

`download.html` 是共用的下载页模板（复用站点 `theme.css`），会自动读取
`<文件夹名>/README.md`，渲染标题、下载按钮和说明文档，样式和站点其它页面保持一致。
