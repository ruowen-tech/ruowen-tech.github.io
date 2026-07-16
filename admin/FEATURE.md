# 后台内容管理系统（Decap CMS）功能说明

> 配套文档：`DEPLOY.md`（部署操作手册）。本文档记录功能设计、架构与踩坑记录。

## 1. 功能概述

为「上海若紊科技有限公司」官网提供可视化内容后台，用于管理两类内容：

- **新闻动态** → `content/news.json`
- **招聘信息** → `content/jobs.json`

运营人员无需接触 Git，登录后台即可增删改，保存后 Decap CMS 自动向仓库提交，GitHub Pages 重新构建即生效。

## 2. 架构

```
GitHub Pages (master 分支, 自定义域名 www.wonderingwall.com)
├── 公开站点      index/about/products/contact/news/recruit.html
├── 内容真源      content/news.json, content/jobs.json
└── 后台          admin/index.html  +  admin/config.yml   (Decap CMS 前端)
                        │
                        │ 登录鉴权（github 后端需要服务端 OAuth 回调）
                        ▼
            Cloudflare Worker OAuth 代理  (ruowen-decap-proxy)
                        │
                        │ 自定义域名 decap.wonderingwall.com（国内直连）
                        ▼
                  GitHub OAuth App「若紊科技 Decap CMS」
```

- **Decap CMS 前端**：`admin/index.html`（从 unpkg CDN 加载 3.3.3），自动读取同目录 `config.yml`。
- **数据存储**：两个 `files` 集合分别指向 `content/news.json`、`content/jobs.json`。
- **登录鉴权**：Decap 的 `github` 后端要求服务端完成 OAuth 回调，因此必须有一个中间代理。

## 3. 登录鉴权方案（关键决策）

### 为什么需要代理

Decap CMS 的 `github` 后端在登录时需要一个**服务端 OAuth 回调端点**来完成 `code → token` 交换，浏览器端的纯静态页面做不了。原官方方案是 Netlify Identity + Git Gateway，但该服务已于 **2025-02-28 废弃**，故改用 **Cloudflare Worker 自建 OAuth 代理**。

### 代理工作流程

1. 后台点 "Login with GitHub" → 弹窗打开 `base_url` 的 `auth_endpoint`。
2. Worker `/auth` 302 跳 GitHub 授权页（带 `client_id` + `redirect_uri=<base_url>/callback`）。
3. 用户授权后 GitHub 回调 `/callback`，Worker 用 `client_secret` 换 `access_token`。
4. Worker 通过 `postMessage` 把 token 回传给 Decap 弹窗，登录完成。

### 域名选择（踩过坑，见第 4 节）

- 代理最初部署在 `*.workers.dev`（Cloudflare 免费子域），但**国内直连不可达**。
- 最终迁到自定义域名 **`decap.wonderingwall.com`**（DNS 迁到 Cloudflare 后绑定），国内直连可用。

## 4. 已知问题与解决

### 问题 1：`*.workers.dev` 国内不可达 → 登录弹空白页

- **现象**：点击 "Login with GitHub" 后弹出空白页，不跳转。
- **根因**：Decap 弹窗加载 `ruowen-decap-proxy.spt-genius.workers.dev`，而该域名在大陆直连超时（翻墙才通），弹窗加载失败即停空白。
- **解决**：把 `wonderingwall.com` 的 DNS 迁到 Cloudflare，给 Worker 绑定自定义域名 `decap.wonderingwall.com`，`config.yml` 的 `base_url` 改为该域名。

### 问题 2：Worker 误绑全域名 → 官网整站宕机

- **现象**：`www.wonderingwall.com`、`wonderingwall.com`、内页全部跳 GitHub 登录页，官网打不开。
- **根因**：在 Cloudflare 给 Worker 加了匹配根域名全量的路由（如 `wonderingwall.com/*`、`*.wonderingwall.com/*` 或漏写 `*` 的 `wonderingwall.com/`），流量被 Worker 全部截走。
- **解决**：
  - Cloudflare 区 → **Workers Routes** 删除所有指向 `ruowen-decap-proxy` 的路由（尤其全量/根路径路由）。
  - Worker → **Settings → Domains & Routes** 仅保留自定义域名 `decap.wonderingwall.com`。
  - DNS 确认 `www → CNAME → ruowen-tech.github.io`（GitHub Pages）已恢复。
- **经验**：OAuth 代理只应通过**自定义子域**生效，绝不能把路由挂到根域名或 `www`。

### 问题 3：根路径 `/` 残留路由

- **现象**：内页、admin、子域均正常，唯独首页 `/` 仍跳 GitHub。
- **根因**：存在一条只匹配根路径（漏写 `/*`）的 Worker Route。
- **解决**：删除该根路径路由即可，无需动其他配置。

### 问题 4：后台入口公开暴露

- **现象**：导航栏与页脚均有「后台管理」链接，任何人可见。
- **解决**：移除 6 个公开页面的导航栏与页脚链接（共 12 处），后台仅保留可凭 URL 直接访问（隐藏而非删除）。
- **进一步加固建议**：在 `decap.wonderingwall.com` 前加 **Cloudflare Access**（指定账号/邮箱才能进），避免固定路径被猜到。

### 问题 5：OAuth 回调 postMessage 死锁 → 无法登录 / 不能增删改内容

- **现象**：打开后台能进入，但点 "Login with GitHub" 后弹窗要么空白、要么授权后不回传，始终进不了内容编辑；即"不能增加、改变内容"。
- **根因**：`worker/index.js` 的 `/callback` 在换到 `access_token` 后，先 `window.addEventListener("message", receiveMessage)` 等待**父窗口（Decap 弹窗）回发消息**，再 `postMessage` 把 token 交还。但 Decap 的 github 后端弹窗**根本不会**向代理窗口发任何消息——它只被动监听 `authorization:github:success:...`。于是 `receiveMessage` 永不触发，token 永不回传，登录握手卡死。
- **解决**：把 `/callback` 改成标准 Decap 代理流程——换到 token 后**立即** `window.opener.postMessage("authorization:github:success:" + JSON.stringify({token, provider:"github"}), window.location.origin)`，随后 `window.close()`。不再等待任何父窗口消息。
- **验证**：`/auth`、`/` 均 302 跳 GitHub（`client_id=Ov23liW90aHanaMyMxPE`、回调 `https://decap.wonderingwall.com/callback`、`scope=public_repo`），`/callback` 无 code 返回 400，符合预期；修复后需重新 `wrangler deploy` 生效（见 `DEPLOY.md`）。
- **更正（问题 7 补充）**：上面"Decap 弹窗不会回发消息"的结论有误——Decap 标准握手中父窗口**会**回发消息。当时登录失败的真实原因是后续的组织 OAuth 授权限制（问题 6）+ postMessage targetOrigin 错误（问题 7），并非死锁。此版"立即直接回发"的写法因 targetOrigin 用错而引出问题 7。

### 问题 6：组织启用 OAuth App 访问限制 → 保存报 `API_ERROR ... OAuth App access restrictions`

- **现象**：登录后能进后台，但保存内容报红 `Failed to persist entry: API_ERROR: ... the 'ruowen-tech' organization has enabled OAuth App access restrictions ...`。
- **根因**：`ruowen-tech` 是**组织账号**并开启了「第三方 OAuth App 访问限制」，Decap 的 OAuth App 未获组织批准，GitHub 拒绝一切写入（凭证正确也无效）。属 GitHub 组织级设置，非代码问题。
- **解决**：组织 Owner 到 `https://github.com/organizations/ruowen-tech/settings/oauth_application_policy` 批准该 OAuth App。注意该页**只列出已发起过访问请求的 App**：若列表里找不到，需先用组织成员账号在后台走一遍登录授权、在 GitHub 授权页对 `ruowen-tech` 点 Request/Grant 以产生请求，App 才会出现，再由 Owner 批准。

### 问题 7：OAuth 回调 postMessage targetOrigin 错误 → 弹窗闪关、授权页无反应

- **现象**：组织授权通过后，点 "Login with GitHub" 弹窗打开即自动关闭，登录页原地不动，进不了后台。
- **根因**：`/callback` 回发 token 时用 `window.location.origin`（=代理域 `decap.wonderingwall.com`）作为 `postMessage` 的 `targetOrigin`，而接收方父窗口是 `www.wonderingwall.com`，origin 不匹配 → 浏览器丢弃消息 → 父窗口收不到 token；同时 `window.close()` 照常执行 → 弹窗闪关。
- **解决**：恢复 Decap/Netlify-CMS 官方标准握手——弹窗先 `postMessage('authorizing:github', '*')`，父窗口回发消息后据 `e.origin` 得到父窗口真实 origin，再用该 origin 回发 `authorization:github:success:{token}`；并加 2 秒站点 origin 兜底。提交 `2ff0cd9`（master/develop 同步），**需重新 `wrangler deploy` 生效**。

## 5. 关键配置现状

| 项 | 值 |
|---|---|
| 仓库 | `ruowen-tech/ruowen-tech.github.io` |
| 发布分支 | `master` |
| 站点域名 | `www.wonderingwall.com`（CNAME → GitHub Pages） |
| 后台地址 | `https://www.wonderingwall.com/admin/`（入口已隐藏） |
| Decap `base_url` | `https://decap.wonderingwall.com` |
| OAuth 代理 Worker | `ruowen-decap-proxy`（Cloudflare） |
| 代理自定义域名 | `decap.wonderingwall.com` |
| GitHub OAuth App | 「若紊科技 Decap CMS」 |
| OAuth 回调地址 | `https://decap.wonderingwall.com/callback` |
| 联系邮箱 | `contact@wonderingwall.com`（Cloudflare Email Routing 转发至运营者个人收件箱） |
| HR 投递邮箱 | `hr@wonderingwall.com`（招聘页"投递简历/投递人才库"用，需 Cloudflare Email Routing 转发） |
| 合作热线 | `+86 21 5000 0000`（已注释隐藏，待启用） |

## 6. 访问入口

- **公开站点**：`https://www.wonderingwall.com/`
- **内容后台**：`https://www.wonderingwall.com/admin/`（入口已隐藏，凭 URL 访问；登录走 `decap.wonderingwall.com` 代理，国内直连无需翻墙）

## 7. 联系邮箱配置 ✅ 已完成

- **联系邮箱**：统一为 `contact@wonderingwall.com`。
  - 此前误用 `contact@ruowen-tech.com`，但该域名无 DNS / 收信能力，实际收不到信；已全面改回自有域名 `wonderingwall.com`。
- **收信方案**：Cloudflare **Email Routing**（DNS 已迁 Cloudflare），将 `contact@wonderingwall.com` 转发至运营者个人收件箱。免费、国内可达、无需额外邮件服务商。
- **改动范围**：`index / about / products / news / contact` 共 5 个页面、9 处邮箱链接与 meta 描述，已全部替换并校验无残留（提交 `e38ce4d`）。
- **完成确认**：需向 `contact@wonderingwall.com` 发一封测试信，确认能进个人收件箱（检查 Cloudflare Email Routing 地址状态为 Active、目标邮箱已完成验证、MX/TXT 记录未被旧阿里云记录覆盖）。

### HR 投递邮箱

- **HR 邮箱**：统一为 `hr@wonderingwall.com`（招聘页"投递简历/投递人才库"按钮与页脚联系栏使用）。
  - 此前误用 `hr@ruowen-tech.com`（无 DNS / 收信能力）。已全面替换为自有域名 `wonderingwall.com`（提交 `55577c0`）。
  - 接收简历的 `mailto:` 链接位于 `recruit.html`（3 处）与 `assets/js/recruit.js`（1 处，岗位"投递简历"按钮自动带 `subject=应聘：岗位名`），已全部替换并校验无残留。
- **收信前提**：需在 Cloudflare **Email Routing** 另加一条 `hr@wonderingwall.com` → 个人收件箱的转发规则（与 `contact@` 同源即可，目标邮箱已验证则即时生效）。仅配 `contact@` 时 `hr@` 仍收不到信。

## 8. 联系表单真实发信（Cloudflare Worker + Resend）✅ 已实现，待填密钥

### 背景（一个被发现的 bug）

`contact.html` 的「提交咨询」表单（`#contactForm`）原本是**纯前端假表单**：`assets/js/main.js` 只做字段校验后直接把提示框写成"提交成功"并 `form.reset()`，**全程没有任何发信动作**。访客填写的姓名/电话/邮箱/需求在浏览器里被清空丢弃，运营者**收不到任何网页提交的咨询**——且这跟 Cloudflare Email Routing 无关（路由只对直接发到该邮箱的邮件生效，表单没用它）。

> 方案演进：先试 **EmailJS**（纯前端 SaaS），但免费额度有限（200/月）、部分能力转付费、且 Public Key 暴露在浏览器；用户要求"纯免费 + 代码自控"，遂改用 **Cloudflare Worker + Resend**——发信逻辑 100% 写在自己的 Worker 里，Resend 仅作免费 SMTP 中继，API Key 存为 Worker Secret 不进浏览器。

### 架构

```
访客填表 → contact.html(JS) → POST JSON → decap.wonderingwall.com/api/contact (我们的 Worker)
                                                  │ 携 RESEND_API_KEY(Secret)
                                                  ▼
                                            Resend API (免费档 3000/月)
                                                  ▼
                                       contact@wonderingwall.com（→ 个人邮箱）
```

### 实现

- `main.js` 表单处理改为 `fetch('https://decap.wonderingwall.com/api/contact', {method:'POST', JSON})`；成功显示"提交成功…"，失败显示"提交失败…或直接发邮件至 contact@wonderingwall.com"。
- `admin/worker/index.js` 新增路由 `/api/contact`：
  - 处理 CORS（仅允许 `https://www.wonderingwall.com`，含 OPTIONS 预检）。
  - 校验 name/email/message，用 `escapeHtml` 转义后拼 HTML 邮件体。
  - 调 `https://api.resend.com/emails`，`from: 若紊科技 <contact@wonderingwall.com>`，`to: contact@wonderingwall.com`，`reply_to: 访客邮箱`，`subject: 合作咨询 - {name}`。
  - 返回 `{ok:true}` 或 `{ok:false, error}`，供前端判断。
- 已移除 `contact.html` 的 EmailJS SDK 引用（不再依赖第三方前端库）。

### 运营者需要做的（一次性，控制台操作）

1. 注册 [Resend](https://resend.com/) 免费账号（**3000 封/月、100 封/天、无需信用卡**）。
2. **Domains → Add Domain → `wonderingwall.com`**，按提示在 **Cloudflare DNS** 添加 Resend 给的 SPF / DKIM / DMARC 记录（TXT），等待状态变 Verified。
3. **API Keys → Create Key**，复制 `re_...` 密钥。
4. 在本地 `admin/worker` 目录执行：`npx wrangler secret put RESEND_API_KEY`，粘贴上面的密钥。
5. 重新部署 Worker：`npx wrangler deploy`（确保 `RESEND_API_KEY` 生效；`GITHUB_CLIENT_ID/SECRET` 不受影响）。
6. 提交推送前端改动，浏览器打开 `https://www.wonderingwall.com/contact.html` 实测：填表提交应显示"提交成功"，个人邮箱收到咨询邮件。

- 前端提交记录：`e4074a4` → 改 Resend：`（本提交）`（contact.html 去 EmailJS、main.js 改 POST、worker 加 /api/contact）。
- ✅ 免费、代码自控、Secret 不暴露浏览器；发件域为自有域名 `wonderingwall.com`（Resend 要求验证域名，已含在第 2 步）。
